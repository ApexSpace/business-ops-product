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
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { SetBusinessOwnerDto } from '../dto/set-owner.dto';
import {
  InviteMemberResponseDto,
  MemberResponseDto,
} from '../dto/member-response.dto';
import { BusinessMembershipRepository } from '../repositories/business-membership.repository';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { formatUserName } from '@app/modules/communications/email/utils/email-variables.util';

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

    return {
      items: items.map((m) => this.toMemberResponse(m)),
      meta: { total, page, limit },
    };
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

    const withUser = await this.membershipRepository.findById(updated.id);
    return this.toMemberResponse(withUser!);
  }

  private toMemberResponse(
    membership: Awaited<
      ReturnType<BusinessMembershipRepository['findById']>
    > & {},
  ): MemberResponseDto {
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
    };
  }
}
