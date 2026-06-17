import { PlatformMemberRole, PrismaClient } from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';

let cachedSystemActorUserId: string | null | undefined;

export async function resolveAutomationActorUserId(
  prisma: PrismaClient,
  fallbackUserId?: string | null,
): Promise<string | null> {
  if (fallbackUserId) {
    return fallbackUserId;
  }

  if (cachedSystemActorUserId !== undefined) {
    return cachedSystemActorUserId;
  }

  const fromEnv = process.env.SYSTEM_AUDIT_ACTOR_USER_ID?.trim();
  if (fromEnv) {
    const user = await prisma.user.findUnique({
      where: { id: fromEnv },
      select: { id: true },
    });
    if (user) {
      cachedSystemActorUserId = user.id;
      return user.id;
    }
  }

  const superAdmin = await prisma.user.findFirst({
    where: {
      platformMembership: {
        role: PlatformMemberRole.SUPER_ADMIN,
        deletedAt: null,
      },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  cachedSystemActorUserId = superAdmin?.id ?? null;
  return cachedSystemActorUserId;
}

export function automationAuditMetadata(
  runId: string,
  workflowId: string,
): Record<string, unknown> {
  return {
    source: 'automation',
    automationRunId: runId,
    automationWorkflowId: workflowId,
  };
}

export { SYSTEM_AUDIT_ACTOR_SENTINEL };
