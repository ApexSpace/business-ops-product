import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BusinessMemberRole,
  MembershipStatus,
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
import { SetBusinessOwnerDto } from '../dto/set-owner.dto';
import {
  InviteMemberResponseDto,
  MemberResponseDto,
} from '../dto/member-response.dto';
import { BusinessMembershipRepository } from '../repositories/business-membership.repository';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { formatUserName } from '@app/modules/communications/email/utils/email-variables.util';
import { buildPublicStaffBookingUrl } from '@app/modules/operations/public-booking/utils/public-booking-url.util';

@Injectable()
export class MembershipService {
  constructor(
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly prisma: PrismaService,
    private readonly emailNotificationService: EmailNotificationService,
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
  ): Promise<InviteMemberResponseDto> {
    if (dto.role === BusinessMemberRole.OWNER) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot invite as OWNER',
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

    void this.emailNotificationService
      .enqueueTransactionalEmail({
        businessId,
        emailType: 'membership.invite',
        toEmail: dto.email,
        userId: user.id,
        entityType: 'BusinessMembership',
        entityId: membership.id,
        idempotencyKey: `membership-invite-${membership.id}`,
        variables: {
          'invitee.email': dto.email,
          'inviter.name': formatUserName(inviter ?? { email: actor.email }),
          'business.name': business.name,
          invite_link: inviteLink,
        },
      })
      .catch(() => undefined);

    return {
      ...this.toMemberResponse(withUser!),
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

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const email = dto.email.trim().toLowerCase();
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
        status: UserStatus.ACTIVE,
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          ...(user.status === UserStatus.INVITED
            ? { status: UserStatus.ACTIVE }
            : {}),
        },
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

    const membershipData = {
      role: dto.role,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
      inviteToken: null,
      deletedAt: null,
      phoneNumber: dto.phoneNumber?.trim() || null,
      gender: dto.gender ?? null,
      isServiceProvider: dto.isServiceProvider ?? false,
      canAssignProductSales: dto.canAssignProductSales ?? false,
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
