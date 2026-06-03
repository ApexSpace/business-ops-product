import { Injectable, Logger } from '@nestjs/common';
import { PlatformMemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '../constants/audit.constants';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export interface AuditLogInput {
  actorUserId: string;
  businessId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  /** undefined = not loaded; null = no system user found */
  private cachedSystemActorUserId: string | null | undefined;

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly prisma: PrismaService,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    const actorUserId = await this.resolveActorUserId(input.actorUserId);
    if (!actorUserId) {
      this.logger.warn(
        `Audit log skipped (${input.action}): configure SYSTEM_AUDIT_ACTOR_USER_ID or seed a platform super admin`,
      );
      return;
    }

    try {
      await this.auditLogRepository.create({
        ...input,
        actorUserId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      });
    } catch (error) {
      this.logger.warn(
        `Audit log failed (${input.action}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async resolveActorUserId(
    actorUserId: string,
  ): Promise<string | null> {
    if (actorUserId !== SYSTEM_AUDIT_ACTOR_SENTINEL) {
      return actorUserId;
    }

    if (this.cachedSystemActorUserId !== undefined) {
      return this.cachedSystemActorUserId;
    }

    const fromEnv = process.env.SYSTEM_AUDIT_ACTOR_USER_ID?.trim();
    if (fromEnv) {
      const user = await this.prisma.user.findUnique({
        where: { id: fromEnv },
        select: { id: true },
      });
      if (user) {
        this.cachedSystemActorUserId = user.id;
        return user.id;
      }
      this.logger.warn(
        `SYSTEM_AUDIT_ACTOR_USER_ID is set but no user exists with that id`,
      );
    }

    const superAdmin = await this.prisma.user.findFirst({
      where: {
        platformMembership: {
          role: PlatformMemberRole.SUPER_ADMIN,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    this.cachedSystemActorUserId = superAdmin?.id ?? null;
    return this.cachedSystemActorUserId;
  }

  findByBusinessId(businessId: string, skip: number, take: number) {
    return this.auditLogRepository.findByBusinessId(businessId, skip, take);
  }

  findAll(
    skip: number,
    take: number,
    filters?: { businessId?: string; action?: string },
  ) {
    return this.auditLogRepository.findAll(skip, take, filters);
  }
}
