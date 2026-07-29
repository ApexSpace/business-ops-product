import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BusinessMemberRole,
  MembershipStatus,
  ServiceCommissionType,
  ServiceStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { UserRepository } from '@app/modules/platform/auth/repositories/user.repository';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { CreateStaffMemberDto } from '../dto/create-staff-member.dto';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { SetTimeClockPinDto } from '../dto/set-time-clock-pin.dto';
import { UpdateStaffMemberProfileDto } from '../dto/update-staff-member-profile.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import {
  ReplaceStaffMemberServicesDto,
  UpdateMemberDetailsDto,
  UpdateMemberNotificationsDto,
  UpdateMemberPermissionsDto,
  UpdateStaffCompensationDto,
} from '../dto/staff-member-settings.dto';
import { SetBusinessOwnerDto } from '../dto/set-owner.dto';
import {
  defaultPermissionsForMember,
  hasStaffPermission,
  isStaffPermissionKey,
  normalizeNotificationSettings,
  normalizeStaffPermissions,
  STAFF_PERMISSION_KEYS,
} from '../permissions/staff-permission.registry';
import {
  InviteMemberResponseDto,
  MemberResponseDto,
} from '../dto/member-response.dto';
import { BusinessMembershipRepository } from '../repositories/business-membership.repository';
import { NotificationDispatchService } from '@app/modules/communications/notifications/services/notification-dispatch.service';
import { formatUserName } from '@app/modules/communications/email/utils/email-variables.util';
import { buildPublicStaffBookingUrl } from '@app/modules/operations/public-booking/utils/public-booking-url.util';
import { EntitlementService } from '@app/modules/platform/business/services/entitlement.service';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async listForBusiness(
    businessId: string,
    query: ListMembersQueryDto,
  ): Promise<{
    items: MemberResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.membershipRepository.findManyPaginated(
      businessId,
      {
        skip,
        take,
        search: query.search?.trim() || undefined,
      },
    );

    const bookingContext = await this.resolveBookingLinkContext(businessId);

    return {
      items: items.map((m) => this.toMemberResponse(m, bookingContext)),
      meta: { total, page, limit },
    };
  }

  private async resolveBookingLinkContext(businessId: string): Promise<{
    slug: string | null;
    enabled: boolean;
    frontendUrl: string;
  }> {
    const settings = await this.prisma.businessOnlineBookingSettings.findUnique(
      { where: { businessId } },
    );
    const frontendUrl = this.configService.get('app', {
      infer: true,
    }).frontendUrl;
    return {
      slug: settings?.publicSlug ?? null,
      enabled: settings?.onlineBookingEnabled ?? false,
      frontendUrl,
    };
  }

  async updateStaffProfile(
    businessId: string,
    targetUserId: string,
    dto: UpdateStaffMemberProfileDto,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.membershipRepository.update(membership.id, {
      ...(dto.onlineBookingEnabled !== undefined
        ? { onlineBookingEnabled: dto.onlineBookingEnabled }
        : {}),
      ...(dto.isServiceProvider !== undefined
        ? { isServiceProvider: dto.isServiceProvider }
        : {}),
      ...(dto.canManageWaitlist !== undefined
        ? { canManageWaitlist: dto.canManageWaitlist }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.staff_profile_updated',
      entityType: 'BusinessMembership',
      entityId: updated.id,
      metadata: { ...dto },
    });

    const withUser = await this.membershipRepository.findById(updated.id);
    const bookingContext = await this.resolveBookingLinkContext(businessId);
    return this.toMemberResponse(withUser!, bookingContext);
  }

  async listForPlatform(businessId: string): Promise<MemberResponseDto[]> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const members =
      await this.membershipRepository.findByBusinessId(businessId);
    return members.map((m) => this.toMemberResponse(m));
  }

  async setOwnerForPlatform(
    businessId: string,
    dto: SetBusinessOwnerDto,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const ownerCount = await this.membershipRepository.countOwners(businessId);
    if (ownerCount > 0) {
      throw new AppException(
        ErrorCode.OWNER_ALREADY_EXISTS,
        'Business already has an owner',
        HttpStatus.CONFLICT,
      );
    }

    const rounds = this.configService.get('auth.bcryptRounds', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const email = dto.email.trim().toLowerCase();

    const membershipId = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName: dto.firstName?.trim() || undefined,
            lastName: dto.lastName?.trim() || undefined,
            status: UserStatus.ACTIVE,
          },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            ...(dto.firstName !== undefined
              ? { firstName: dto.firstName?.trim() || null }
              : {}),
            ...(dto.lastName !== undefined
              ? { lastName: dto.lastName?.trim() || null }
              : {}),
            status: UserStatus.ACTIVE,
          },
        });
      }

      const existing = await tx.businessMembership.findUnique({
        where: { userId_businessId: { userId: user.id, businessId } },
      });

      if (existing) {
        const updated = await tx.businessMembership.update({
          where: { id: existing.id },
          data: {
            role: BusinessMemberRole.OWNER,
            status: MembershipStatus.ACTIVE,
            joinedAt: existing.joinedAt ?? new Date(),
            deletedAt: null,
            inviteToken: null,
            invitedBy: { connect: { id: actor.id } },
          },
        });
        return updated.id;
      }

      const created = await tx.businessMembership.create({
        data: {
          user: { connect: { id: user.id } },
          business: { connect: { id: businessId } },
          role: BusinessMemberRole.OWNER,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
          invitedBy: { connect: { id: actor.id } },
        },
      });
      return created.id;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.owner.set',
      entityType: 'BusinessMembership',
      entityId: membershipId,
      metadata: { email, role: BusinessMemberRole.OWNER },
    });

    const withUser = await this.membershipRepository.findById(membershipId);
    return this.toMemberResponse(withUser!);
  }

  async invite(
    businessId: string,
    dto: InviteMemberDto,
    actor: RequestUser,
    options?: { allowOwnerRole?: boolean },
  ): Promise<InviteMemberResponseDto> {
    const invitingAsOwner =
      dto.role === BusinessMemberRole.OWNER && options?.allowOwnerRole === true;

    if (dto.role === BusinessMemberRole.OWNER && !invitingAsOwner) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot invite as OWNER',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (invitingAsOwner) {
      const ownerCount =
        await this.membershipRepository.countOwners(businessId);
      if (ownerCount > 0) {
        throw new AppException(
          ErrorCode.OWNER_ALREADY_EXISTS,
          'Business already has an owner',
          HttpStatus.CONFLICT,
        );
      }
    } else {
      await this.entitlementService.assertStaffLimit(businessId);
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const inviteToken = randomUUID();
    let user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      const rounds = this.configService.get('auth.bcryptRounds', {
        infer: true,
      });
      const passwordHash = await bcrypt.hash(randomUUID(), rounds);
      user = await this.userRepository.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.INVITED,
      });
    }

    const existing = await this.membershipRepository.findByUserAndBusinessAny(
      user.id,
      businessId,
    );
    if (
      existing &&
      existing.status !== MembershipStatus.REMOVED &&
      !existing.deletedAt
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'User is already a member or invited',
        HttpStatus.CONFLICT,
      );
    }

    const membership = existing
      ? await this.membershipRepository.update(existing.id, {
          role: dto.role,
          status: MembershipStatus.INVITED,
          inviteToken,
          deletedAt: null,
          invitedBy: { connect: { id: actor.id } },
        })
      : await this.membershipRepository.create({
          user: { connect: { id: user.id } },
          business: { connect: { id: businessId } },
          role: dto.role,
          status: MembershipStatus.INVITED,
          inviteToken,
          invitedBy: { connect: { id: actor.id } },
        });

    const frontendUrl = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.invited',
      entityType: 'BusinessMembership',
      entityId: membership.id,
      metadata: { email: dto.email, role: dto.role },
    });

    const withUser = await this.membershipRepository.findById(membership.id);
    const inviter = await this.userRepository.findById(actor.id);

    void this.notificationDispatch
      .dispatch({
        businessId,
        notificationKey: 'membership.invite',
        toEmail: dto.email,
        toPhone: null,
        userId: user.id,
        entityType: 'BusinessMembership',
        entityId: membership.id,
        idempotencyKey: `membership-invite-${membership.id}`,
        missingRecipient: 'skip',
        variables: {
          'invitee.email': dto.email,
          'inviter.name': formatUserName(inviter ?? { email: actor.email }),
          'business.name': business.name,
          invite_link: inviteLink,
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue membership invite email for ${dto.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    return {
      ...this.toMemberResponse(withUser!),
      inviteLink,
    };
  }

  async resendInvite(
    businessId: string,
    targetUserId: string,
    actor: RequestUser,
  ): Promise<InviteMemberResponseDto> {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (membership.status !== MembershipStatus.INVITED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only invited members can receive a new invite',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (membership.role === BusinessMemberRole.OWNER) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot resend invite for owner',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const inviteToken = randomUUID();
    await this.membershipRepository.update(membership.id, { inviteToken });

    const frontendUrl = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;
    const inviter = await this.userRepository.findById(actor.id);

    void this.notificationDispatch
      .dispatch({
        businessId,
        notificationKey: 'membership.invite',
        toEmail: membership.user.email,
        toPhone: null,
        userId: membership.userId,
        entityType: 'BusinessMembership',
        entityId: membership.id,
        idempotencyKey: `membership-invite-resend-${membership.id}-${Date.now()}`,
        missingRecipient: 'skip',
        variables: {
          'invitee.email': membership.user.email,
          'inviter.name': formatUserName(inviter ?? { email: actor.email }),
          'business.name': business.name,
          invite_link: inviteLink,
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue membership invite resend for ${membership.user.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.invite_resent',
      entityType: 'BusinessMembership',
      entityId: membership.id,
      metadata: { email: membership.user.email },
    });

    const refreshed = await this.membershipRepository.findById(membership.id);
    return {
      ...this.toMemberResponse(refreshed!),
      inviteLink,
    };
  }

  async createStaffMember(
    businessId: string,
    dto: CreateStaffMemberDto,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    if (dto.role === BusinessMemberRole.OWNER) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot add staff as OWNER',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.entitlementService.assertStaffLimit(businessId);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const email = dto.email.trim().toLowerCase();
    const sendInvite = dto.sendInvite !== false;
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      const rounds = this.configService.get('auth.bcryptRounds', {
        infer: true,
      });
      const passwordHash = await bcrypt.hash(randomUUID(), rounds);
      user = await this.userRepository.create({
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        status: sendInvite ? UserStatus.INVITED : UserStatus.ACTIVE,
      });
    } else {
      const userUpdate: {
        firstName: string;
        lastName: string;
        status?: UserStatus;
      } = {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      };
      if (!sendInvite && user.status === UserStatus.INVITED) {
        userUpdate.status = UserStatus.ACTIVE;
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: userUpdate,
      });
    }

    const existing = await this.membershipRepository.findByUserAndBusinessAny(
      user.id,
      businessId,
    );
    if (
      existing &&
      existing.status !== MembershipStatus.REMOVED &&
      !existing.deletedAt
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'A staff member with this email already exists',
        HttpStatus.CONFLICT,
      );
    }

    let timeclockPin: string | undefined;
    if (dto.timeClockPin) {
      await this.assertPinUnique(businessId, dto.timeClockPin, user.id);
      const rounds = this.configService.get('auth.bcryptRounds', {
        infer: true,
      });
      timeclockPin = await bcrypt.hash(dto.timeClockPin, rounds);
    }

    const inviteToken = sendInvite ? randomUUID() : null;
    const defaultPermissions = defaultPermissionsForMember({
      isServiceProvider: dto.isServiceProvider ?? false,
    });

    const membershipData = {
      role: dto.role,
      status: sendInvite ? MembershipStatus.INVITED : MembershipStatus.ACTIVE,
      joinedAt: sendInvite ? null : new Date(),
      inviteToken,
      deletedAt: null,
      phoneNumber: dto.phoneNumber?.trim() || null,
      gender: dto.gender ?? null,
      isServiceProvider: dto.isServiceProvider ?? false,
      canAssignProductSales: dto.canAssignProductSales ?? false,
      permissions: defaultPermissions,
      notificationSettings: normalizeNotificationSettings({}),
      ...(timeclockPin ? { timeclockPin } : {}),
      invitedBy: { connect: { id: actor.id } },
    };

    const membership = existing
      ? await this.membershipRepository.update(existing.id, membershipData)
      : await this.membershipRepository.create({
          user: { connect: { id: user.id } },
          business: { connect: { id: businessId } },
          ...membershipData,
        });

    if (sendInvite && inviteToken) {
      const frontendUrl = this.configService.get('app.frontendUrl', {
        infer: true,
      });
      const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;
      const inviter = await this.userRepository.findById(actor.id);

      void this.notificationDispatch
        .dispatch({
          businessId,
          notificationKey: 'membership.invite',
          toEmail: email,
          toPhone: null,
          userId: user.id,
          entityType: 'BusinessMembership',
          entityId: membership.id,
          idempotencyKey: `membership-invite-${membership.id}-${Date.now()}`,
          missingRecipient: 'skip',
          variables: {
            'invitee.email': email,
            'inviter.name': formatUserName(inviter ?? { email: actor.email }),
            'business.name': business.name,
            invite_link: inviteLink,
          },
        })
        .catch((error) => {
          this.logger.error(
            `Failed to enqueue staff invite email for ${email}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.created',
      entityType: 'BusinessMembership',
      entityId: membership.id,
      metadata: { email, role: dto.role },
    });

    const withUser = await this.membershipRepository.findById(membership.id);
    return this.toMemberResponse(withUser!);
  }

  async updateMember(
    businessId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.role === BusinessMemberRole.OWNER) {
      const ownerCount =
        await this.membershipRepository.countOwners(businessId);
      if (ownerCount > 0 && membership.role !== BusinessMemberRole.OWNER) {
        throw new AppException(
          ErrorCode.OWNER_ALREADY_EXISTS,
          'Business already has an owner',
          HttpStatus.CONFLICT,
        );
      }
    }

    if (
      membership.role === BusinessMemberRole.OWNER &&
      dto.role &&
      dto.role !== BusinessMemberRole.OWNER
    ) {
      const ownerCount =
        await this.membershipRepository.countOwners(businessId);
      if (ownerCount <= 1) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Cannot demote the only owner',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updated = await this.membershipRepository.update(membership.id, {
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.status === MembershipStatus.ACTIVE
        ? { joinedAt: new Date() }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.updated',
      entityType: 'BusinessMembership',
      entityId: updated.id,
      metadata: { ...dto },
    });

    const withUser = await this.membershipRepository.findById(updated.id);
    return this.toMemberResponse(withUser!);
  }

  async archiveMember(
    businessId: string,
    targetUserId: string,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    if (actor.id === targetUserId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'You cannot archive your own account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Staff member not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (membership.role === BusinessMemberRole.OWNER) {
      const ownerCount =
        await this.membershipRepository.countOwners(businessId);
      if (ownerCount <= 1) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Cannot archive the only owner',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updated = await this.membershipRepository.update(membership.id, {
      status: MembershipStatus.REMOVED,
      deletedAt: new Date(),
      inviteToken: null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.archived',
      entityType: 'BusinessMembership',
      entityId: updated.id,
    });

    const withUser = await this.membershipRepository.findByIdWithUser(
      updated.id,
    );
    if (!withUser) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Failed to load archived member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return this.toMemberResponse(withUser);
  }

  async removeMember(
    businessId: string,
    targetUserId: string,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (membership.role === BusinessMemberRole.OWNER) {
      const ownerCount =
        await this.membershipRepository.countOwners(businessId);
      if (ownerCount <= 1) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Cannot remove the only owner',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updated = await this.membershipRepository.update(membership.id, {
      status: MembershipStatus.REMOVED,
      deletedAt: new Date(),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.removed',
      entityType: 'BusinessMembership',
      entityId: updated.id,
    });

    const withUser = await this.membershipRepository.findByIdWithUser(
      updated.id,
    );
    if (!withUser) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Failed to load removed member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return this.toMemberResponse(withUser);
  }

  async setTimeClockPin(
    businessId: string,
    targetUserId: string,
    dto: SetTimeClockPinDto,
    actor: RequestUser,
  ): Promise<{ success: true }> {
    await this.assertCanManagePin(businessId, targetUserId, actor);
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.assertPinUnique(businessId, dto.pin, targetUserId);
    const rounds = this.configService.get('auth.bcryptRounds', { infer: true });
    const timeclockPin = await bcrypt.hash(dto.pin, rounds);

    await this.membershipRepository.update(membership.id, { timeclockPin });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.timeclock_pin.set',
      entityType: 'BusinessMembership',
      entityId: membership.id,
    });

    return { success: true };
  }

  async removeTimeClockPin(
    businessId: string,
    targetUserId: string,
    actor: RequestUser,
  ): Promise<{ success: true }> {
    await this.assertCanManagePin(businessId, targetUserId, actor);
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.membershipRepository.update(membership.id, {
      timeclockPin: null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.timeclock_pin.removed',
      entityType: 'BusinessMembership',
      entityId: membership.id,
    });

    return { success: true };
  }

  async getMember(
    businessId: string,
    targetUserId: string,
  ): Promise<MemberResponseDto & {
    permissions: Record<string, boolean>;
    notificationSettings: Record<string, boolean>;
  }> {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const bookingContext = await this.resolveBookingLinkContext(businessId);
    return {
      ...this.toMemberResponse(membership, bookingContext),
      permissions: this.resolvePermissionsForResponse(membership),
      notificationSettings: normalizeNotificationSettings(
        membership.notificationSettings,
      ),
    };
  }

  async updateMemberDetails(
    businessId: string,
    targetUserId: string,
    dto: UpdateMemberDetailsDto,
    actor: RequestUser,
  ): Promise<MemberResponseDto> {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.email && dto.email.trim().toLowerCase() !== membership.user.email) {
      const existing = await this.userRepository.findByEmail(
        dto.email.trim().toLowerCase(),
      );
      if (existing && existing.id !== membership.userId) {
        throw new AppException(
          ErrorCode.EMAIL_ALREADY_EXISTS,
          'Email already in use',
          HttpStatus.CONFLICT,
        );
      }
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: { email: dto.email.trim().toLowerCase() },
      });
    }

    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: {
          ...(dto.firstName !== undefined
            ? { firstName: dto.firstName.trim() }
            : {}),
          ...(dto.lastName !== undefined
            ? { lastName: dto.lastName.trim() }
            : {}),
        },
      });
    }

    const profilePatch: Record<string, unknown> = {};
    if (dto.phoneNumber !== undefined) {
      profilePatch.phoneNumber = dto.phoneNumber.trim() || null;
    }
    if (dto.gender !== undefined) profilePatch.gender = dto.gender;
    if (dto.isServiceProvider !== undefined) {
      profilePatch.isServiceProvider = dto.isServiceProvider;
    }
    if (dto.onlineBookingEnabled !== undefined) {
      profilePatch.onlineBookingEnabled = dto.onlineBookingEnabled;
    }
    if (dto.canAssignProductSales !== undefined) {
      profilePatch.canAssignProductSales = dto.canAssignProductSales;
    }
    if (dto.canManageWaitlist !== undefined) {
      profilePatch.canManageWaitlist = dto.canManageWaitlist;
      profilePatch.permissions = normalizeStaffPermissions({
        ...normalizeStaffPermissions(membership.permissions),
        'appointments.manage_waitlist': dto.canManageWaitlist,
      });
    }

    if (Object.keys(profilePatch).length > 0) {
      await this.membershipRepository.update(membership.id, profilePatch);
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.details_updated',
      entityType: 'BusinessMembership',
      entityId: membership.id,
    });

    const refreshed =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    const bookingContext = await this.resolveBookingLinkContext(businessId);
    return this.toMemberResponse(refreshed!, bookingContext);
  }

  async getMemberPermissions(businessId: string, targetUserId: string) {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      role: membership.role,
      permissions: this.resolvePermissionsForResponse(membership),
    };
  }

  async updateMemberPermissions(
    businessId: string,
    targetUserId: string,
    dto: UpdateMemberPermissionsDto,
    actor: RequestUser,
  ) {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      membership.role === BusinessMemberRole.OWNER ||
      membership.role === BusinessMemberRole.ADMIN
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Admin users have full access and cannot be edited here',
        HttpStatus.BAD_REQUEST,
      );
    }

    const sanitized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(dto.permissions)) {
      if (isStaffPermissionKey(key)) {
        sanitized[key] = value === true;
      }
    }

    await this.membershipRepository.update(membership.id, {
      permissions: normalizeStaffPermissions(sanitized),
      canManageWaitlist: sanitized['appointments.manage_waitlist'] === true,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.permissions_updated',
      entityType: 'BusinessMembership',
      entityId: membership.id,
    });

    return {
      role: membership.role,
      permissions: normalizeStaffPermissions(sanitized),
    };
  }

  async getMemberNotifications(businessId: string, targetUserId: string) {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      notificationSettings: normalizeNotificationSettings(
        membership.notificationSettings,
      ),
    };
  }

  async updateMemberNotifications(
    businessId: string,
    targetUserId: string,
    dto: UpdateMemberNotificationsDto,
    actor: RequestUser,
  ) {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const current = normalizeNotificationSettings(membership.notificationSettings);
    const next = { ...current };
    for (const [key, value] of Object.entries(dto.notificationSettings)) {
      if (key in current && typeof value === 'boolean') {
        next[key as keyof typeof next] = value;
      }
    }

    await this.membershipRepository.update(membership.id, {
      notificationSettings: next,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.notifications_updated',
      entityType: 'BusinessMembership',
      entityId: membership.id,
    });

    return { notificationSettings: next };
  }

  async getMemberCompensation(businessId: string, targetUserId: string) {
    await this.requireMembership(businessId, targetUserId);
    const row = await this.prisma.staffCompensationSettings.findUnique({
      where: { businessId_userId: { businessId, userId: targetUserId } },
    });
    return this.toCompensationResponse(row);
  }

  async updateMemberCompensation(
    businessId: string,
    targetUserId: string,
    dto: UpdateStaffCompensationDto,
    actor: RequestUser,
  ) {
    const membership = await this.requireMembership(businessId, targetUserId);
    if (
      membership.role === BusinessMemberRole.OWNER ||
      membership.role === BusinessMemberRole.ADMIN
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Admin compensation is not configured here',
        HttpStatus.BAD_REQUEST,
      );
    }

    const row = await this.prisma.staffCompensationSettings.upsert({
      where: { businessId_userId: { businessId, userId: targetUserId } },
      create: {
        businessId,
        userId: targetUserId,
        serviceCommissionEnabled: dto.serviceCommissionEnabled ?? false,
        serviceCommissionMode: dto.serviceCommissionMode ?? null,
        serviceCommissionPercent: dto.serviceCommissionPercent ?? null,
        productCommissionEnabled: dto.productCommissionEnabled ?? false,
        productCommissionPercent: dto.productCommissionPercent ?? null,
        productCommissionOverridesEnabled:
          dto.productCommissionOverridesEnabled ?? false,
        hourlyEnabled: dto.hourlyEnabled ?? false,
        hourlyRate: dto.hourlyRate ?? null,
        greaterOfEnabled: dto.greaterOfEnabled ?? false,
      },
      update: {
        ...(dto.serviceCommissionEnabled !== undefined
          ? { serviceCommissionEnabled: dto.serviceCommissionEnabled }
          : {}),
        ...(dto.serviceCommissionMode !== undefined
          ? { serviceCommissionMode: dto.serviceCommissionMode }
          : {}),
        ...(dto.serviceCommissionPercent !== undefined
          ? { serviceCommissionPercent: dto.serviceCommissionPercent }
          : {}),
        ...(dto.productCommissionEnabled !== undefined
          ? { productCommissionEnabled: dto.productCommissionEnabled }
          : {}),
        ...(dto.productCommissionPercent !== undefined
          ? { productCommissionPercent: dto.productCommissionPercent }
          : {}),
        ...(dto.productCommissionOverridesEnabled !== undefined
          ? {
              productCommissionOverridesEnabled:
                dto.productCommissionOverridesEnabled,
            }
          : {}),
        ...(dto.hourlyEnabled !== undefined
          ? { hourlyEnabled: dto.hourlyEnabled }
          : {}),
        ...(dto.hourlyRate !== undefined ? { hourlyRate: dto.hourlyRate } : {}),
        ...(dto.greaterOfEnabled !== undefined
          ? { greaterOfEnabled: dto.greaterOfEnabled }
          : {}),
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.compensation_updated',
      entityType: 'StaffCompensationSettings',
      entityId: row.id,
    });

    return this.toCompensationResponse(row);
  }

  async getMemberServices(businessId: string, targetUserId: string) {
    await this.requireMembership(businessId, targetUserId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        services: {
          where: { deletedAt: null, status: ServiceStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
          include: {
            staffAssignments: {
              where: { userId: targetUserId, businessId },
            },
            onlineBookingSettings: true,
          },
        },
      },
    });

    const bookingContext = await this.resolveBookingLinkContext(businessId);
    const staffBookingBase =
      bookingContext.enabled && bookingContext.slug
        ? buildPublicStaffBookingUrl(
            bookingContext.frontendUrl,
            bookingContext.slug,
            targetUserId,
          )
        : null;

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        services: category.services.map((service) => {
          const assignment = service.staffAssignments[0];
          const serviceBookingUrl =
            staffBookingBase && assignment?.onlineBookingEnabled !== false
              ? `${staffBookingBase}?serviceId=${service.id}`
              : null;
          return {
            id: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            price: service.price,
            isEnabled: Boolean(assignment?.isEnabled),
            durationOverride: assignment?.durationMinutes ?? null,
            priceOverride: assignment?.price ?? null,
            commissionType: assignment?.commissionType ?? null,
            commissionValue: assignment?.commissionValue ?? null,
            onlineBookingEnabled: assignment?.onlineBookingEnabled ?? true,
            directBookingUrl: serviceBookingUrl,
          };
        }),
      })),
    };
  }

  async replaceMemberServices(
    businessId: string,
    targetUserId: string,
    dto: ReplaceStaffMemberServicesDto,
    actor: RequestUser,
  ) {
    await this.requireMembership(businessId, targetUserId);

    const serviceIds = dto.assignments.map((a) => a.serviceId);
    const services = await this.prisma.service.findMany({
      where: {
        businessId,
        deletedAt: null,
        id: { in: serviceIds },
      },
      select: { id: true },
    });
    if (services.length !== new Set(serviceIds).size) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'One or more services were not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceStaff.deleteMany({
        where: { businessId, userId: targetUserId },
      });

      const enabled = dto.assignments.filter((a) => a.isEnabled);
      if (enabled.length > 0) {
        await tx.serviceStaff.createMany({
          data: enabled.map((assignment, index) => ({
            businessId,
            userId: targetUserId,
            serviceId: assignment.serviceId,
            isEnabled: true,
            durationMinutes: assignment.durationMinutes ?? null,
            price: assignment.price ?? null,
            commissionType:
              assignment.commissionType &&
              (assignment.commissionType === 'FLAT' ||
                assignment.commissionType === 'PERCENT')
                ? (assignment.commissionType as ServiceCommissionType)
                : null,
            commissionValue: assignment.commissionValue ?? null,
            onlineBookingEnabled: assignment.onlineBookingEnabled ?? true,
            sortOrder: index,
          })),
        });
      }
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership.services_updated',
      entityType: 'BusinessMembership',
      entityId: targetUserId,
      metadata: { serviceCount: dto.assignments.length },
    });

    return this.getMemberServices(businessId, targetUserId);
  }

  private async requireMembership(businessId: string, targetUserId: string) {
    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        targetUserId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Membership not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return membership;
  }

  private resolvePermissionsForResponse(
    membership: Awaited<
      ReturnType<BusinessMembershipRepository['findByUserAndBusinessWithUser']>
    >,
  ): Record<string, boolean> {
    if (
      membership!.role === BusinessMemberRole.OWNER ||
      membership!.role === BusinessMemberRole.ADMIN
    ) {
      return Object.fromEntries(
        STAFF_PERMISSION_KEYS.map((key) => [key, true]),
      );
    }
    const permissions = normalizeStaffPermissions(membership!.permissions);
    if (membership!.canManageWaitlist) {
      permissions['appointments.manage_waitlist'] = true;
    }
    return permissions;
  }

  private toCompensationResponse(
    row: {
      serviceCommissionEnabled: boolean;
      serviceCommissionMode: string | null;
      serviceCommissionPercent: unknown;
      productCommissionEnabled: boolean;
      productCommissionPercent: unknown;
      productCommissionOverridesEnabled: boolean;
      hourlyEnabled: boolean;
      hourlyRate: unknown;
      greaterOfEnabled: boolean;
    } | null,
  ) {
    if (!row) {
      return {
        serviceCommissionEnabled: false,
        serviceCommissionMode: null,
        serviceCommissionPercent: null,
        productCommissionEnabled: false,
        productCommissionPercent: null,
        productCommissionOverridesEnabled: false,
        hourlyEnabled: false,
        hourlyRate: null,
        greaterOfEnabled: false,
      };
    }
    return {
      serviceCommissionEnabled: row.serviceCommissionEnabled,
      serviceCommissionMode: row.serviceCommissionMode,
      serviceCommissionPercent:
        row.serviceCommissionPercent != null
          ? Number(row.serviceCommissionPercent)
          : null,
      productCommissionEnabled: row.productCommissionEnabled,
      productCommissionPercent:
        row.productCommissionPercent != null
          ? Number(row.productCommissionPercent)
          : null,
      productCommissionOverridesEnabled: row.productCommissionOverridesEnabled,
      hourlyEnabled: row.hourlyEnabled,
      hourlyRate: row.hourlyRate != null ? Number(row.hourlyRate) : null,
      greaterOfEnabled: row.greaterOfEnabled,
    };
  }

  private async assertCanManagePin(
    businessId: string,
    targetUserId: string,
    actor: RequestUser,
  ): Promise<void> {
    if (actor.id === targetUserId) return;

    const actorMembership =
      await this.membershipRepository.findByUserAndBusiness(
        actor.id,
        businessId,
      );
    if (
      actorMembership?.role === BusinessMemberRole.OWNER ||
      actorMembership?.role === BusinessMemberRole.ADMIN
    ) {
      return;
    }

    if (
      hasStaffPermission(
        normalizeStaffPermissions(actorMembership?.permissions),
        'settings.team.manage',
        actorMembership?.role,
      )
    ) {
      return;
    }

    throw new AppException(
      ErrorCode.FORBIDDEN,
      'Not allowed to manage this staff member PIN',
      HttpStatus.FORBIDDEN,
    );
  }

  private async assertPinUnique(
    businessId: string,
    pin: string,
    excludeUserId: string,
  ): Promise<void> {
    const memberships =
      await this.membershipRepository.findActiveWithPins(businessId);

    for (const membership of memberships) {
      if (membership.userId === excludeUserId || !membership.timeclockPin) {
        continue;
      }
      const matches = await bcrypt.compare(pin, membership.timeclockPin);
      if (matches) {
        throw new AppException(
          ErrorCode.TIMECLOCK_PIN_IN_USE,
          'This PIN is already in use by another staff member. Please choose a different one.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private toMemberResponse(
    membership: Awaited<
      ReturnType<BusinessMembershipRepository['findById']>
    > & {},
    bookingContext?: {
      slug: string | null;
      enabled: boolean;
      frontendUrl: string;
    },
  ): MemberResponseDto {
    const staffBookingUrl =
      bookingContext?.enabled &&
      bookingContext.slug &&
      membership.onlineBookingEnabled &&
      membership.isServiceProvider
        ? buildPublicStaffBookingUrl(
            bookingContext.frontendUrl,
            bookingContext.slug,
            membership.userId,
          )
        : null;

    return {
      id: membership.id,
      userId: membership.userId,
      businessId: membership.businessId,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
      createdAt: membership.createdAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        status: membership.user.status,
      },
      hasTimeclockPin: Boolean(membership.timeclockPin),
      phoneNumber: membership.phoneNumber,
      gender: membership.gender,
      isServiceProvider: membership.isServiceProvider,
      canAssignProductSales: membership.canAssignProductSales,
      onlineBookingEnabled: membership.onlineBookingEnabled,
      canManageWaitlist: membership.canManageWaitlist,
      staffBookingUrl,
    };
  }
}
