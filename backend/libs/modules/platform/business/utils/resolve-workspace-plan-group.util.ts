import { PlanGroupStatus, Prisma } from '@prisma/client';

type PlanGroupLookupClient = Pick<Prisma.TransactionClient, 'planGroup'>;

export async function resolveWorkspacePlanGroupId(
  prisma: PlanGroupLookupClient,
  input: {
    subscriptionPlanGroupId?: string | null;
    snapshotId?: string | null;
  },
): Promise<string | null> {
  if (input.subscriptionPlanGroupId) {
    return input.subscriptionPlanGroupId;
  }

  if (input.snapshotId) {
    const snapshotGroup = await prisma.planGroup.findFirst({
      where: {
        snapshotId: input.snapshotId,
        status: PlanGroupStatus.PUBLISHED,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (snapshotGroup) {
      return snapshotGroup.id;
    }
  }

  const defaultGroup = await prisma.planGroup.findFirst({
    where: {
      status: PlanGroupStatus.PUBLISHED,
      deletedAt: null,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  return defaultGroup?.id ?? null;
}
