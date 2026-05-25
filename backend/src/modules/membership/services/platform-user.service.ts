import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformMemberRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { RootConfig } from '../../../config/configuration';
import { AuditService } from '../../audit/services/audit.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { CreatePlatformUserDto, UpdatePlatformUserDto } from '../dto/platform-user.dto';
import { PlatformUserDto } from '../dto/platform-user-response.dto';
import {
  PlatformMembershipAdminRepository,
  PlatformMembershipWithUser,
} from '../repositories/platform-membership-admin.repository';

@Injectable()
export class PlatformUserService {
  constructor(
    private readonly platformMembershipRepository: PlatformMembershipAdminRepository,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    role?: PlatformMemberRole;
  }): Promise<{ items: PlatformUserDto[]; meta: { total: number; page: number; limit: number } }> {
    const { items, total } = await this.platformMembershipRepository.findMany(
      params.skip,
      params.limit,
      params.role,
    );

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async create(
    dto: CreatePlatformUserDto,
    actor: RequestUser,
  ): Promise<PlatformUserDto> {
    if (dto.role === PlatformMemberRole.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Cannot create SUPER_ADMIN via API',
        HttpStatus.FORBIDDEN,
      );
    }

    let user = await this.userRepository.findByEmail(dto.email);

    if (user) {
      const existing = await this.platformMembershipRepository.findByUserId(
        user.id,
      );
      if (existing) {
        throw new AppException(
          ErrorCode.EMAIL_ALREADY_EXISTS,
          'User already has platform access',
          HttpStatus.CONFLICT,
        );
      }
    } else {
      const rounds = this.configService.get('auth.bcryptRounds', { infer: true });
      const password = dto.password ?? randomUUID();
      const passwordHash = await bcrypt.hash(password, rounds);
      user = await this.userRepository.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.ACTIVE,
      });
    }

    const membership = await this.platformMembershipRepository.create({
      userId: user.id,
      role: dto.role,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.user.created',
      entityType: 'PlatformMembership',
      entityId: membership.id,
      metadata: { email: dto.email, role: dto.role },
    });

    return this.toResponse(membership);
  }

  async update(
    id: string,
    dto: UpdatePlatformUserDto,
    actor: RequestUser,
  ): Promise<PlatformUserDto> {
    const membership = await this.platformMembershipRepository.findById(id);
    if (!membership) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Platform user not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      membership.role === PlatformMemberRole.SUPER_ADMIN &&
      dto.role &&
      dto.role !== PlatformMemberRole.SUPER_ADMIN
    ) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Cannot change SUPER_ADMIN role',
        HttpStatus.FORBIDDEN,
      );
    }

    if (dto.role === PlatformMemberRole.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Cannot assign SUPER_ADMIN role',
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.platformMembershipRepository.update(id, {
      role: dto.role,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.user.updated',
      entityType: 'PlatformMembership',
      entityId: id,
      metadata: { changes: dto },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    const membership = await this.platformMembershipRepository.findById(id);
    if (!membership) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Platform user not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (membership.role === PlatformMemberRole.SUPER_ADMIN) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Cannot remove SUPER_ADMIN',
        HttpStatus.FORBIDDEN,
      );
    }

    if (membership.userId === actor.id) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot remove your own platform access',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.platformMembershipRepository.softDelete(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.user.removed',
      entityType: 'PlatformMembership',
      entityId: id,
      metadata: { email: membership.user.email },
    });
  }

  private toResponse(membership: PlatformMembershipWithUser): PlatformUserDto {
    return {
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      status: membership.user.status,
      createdAt: membership.createdAt,
    };
  }
}
