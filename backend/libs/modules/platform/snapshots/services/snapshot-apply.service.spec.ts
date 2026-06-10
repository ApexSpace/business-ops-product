import { SnapshotStatus } from '@prisma/client';
import { SNAPSHOT_SEED_DEFINITIONS } from '../seeds/snapshot-seed-definitions';
import { SnapshotApplyService } from './snapshot-apply.service';

describe('SnapshotApplyService', () => {
  const businessId = 'biz-1';
  const snapshotId = 'snap-1';
  const assets = SNAPSHOT_SEED_DEFINITIONS[0].assets;

  function buildMocks() {
    const provisions = new Map<string, string>();
    const pipelines: unknown[] = [];
    const contacts: unknown[] = [{ id: 'contact-1' }];
    const leads: unknown[] = [{ id: 'lead-1' }];

    const tx = {
      business: {
        update: jest.fn().mockResolvedValue({}),
      },
      pipeline: {
        create: jest.fn().mockImplementation(async (args) => {
          const row = { id: `pipe-${pipelines.length + 1}`, ...args.data };
          pipelines.push(row);
          return row;
        }),
      },
      pipelineStage: { create: jest.fn() },
      service: { create: jest.fn().mockResolvedValue({ id: 'svc-1' }) },
      tag: { create: jest.fn().mockResolvedValue({ id: 'tag-1' }) },
      calendar: { create: jest.fn().mockResolvedValue({ id: 'cal-1' }) },
      calendarAvailability: { create: jest.fn() },
      chatbot: { create: jest.fn().mockResolvedValue({ id: 'bot-1' }) },
      chatbotRule: { create: jest.fn().mockResolvedValue({ id: 'rule-1' }) },
      businessEmailPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'pref-1' }),
      },
      emailTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'tmpl-1' }),
      },
      snapshotProvision: {
        findUnique: jest.fn(async ({ where }) => {
          const key = where.businessId_snapshotId_sourceKey.sourceKey;
          const entityId = provisions.get(key);
          return entityId ? { sourceKey: key, entityId } : null;
        }),
        create: jest.fn().mockImplementation(async ({ data }) => {
          provisions.set(data.sourceKey, data.entityId);
        }),
      },
      contact: { findMany: jest.fn().mockResolvedValue(contacts) },
      lead: { findMany: jest.fn().mockResolvedValue(leads) },
    };

    const prisma = {
      $transaction: jest.fn(
        async (
          fn: (client: typeof tx) => Promise<void>,
          _options?: { timeout?: number; maxWait?: number },
        ) => fn(tx),
      ),
    };

    const snapshotRepository = {
      findPublishedById: jest.fn().mockResolvedValue({
        id: snapshotId,
        status: SnapshotStatus.PUBLISHED,
        assets,
      }),
    };

    const validationService = {
      validateAndSanitize: jest.fn(() => assets),
    };

    const service = new SnapshotApplyService(
      prisma as never,
      snapshotRepository as never,
      validationService,
    );

    return { service, prisma, tx, provisions, pipelines, contacts, leads };
  }

  it('uses extended transaction timeout for large snapshot applies', async () => {
    const { service, prisma } = buildMocks();
    await service.apply(businessId, snapshotId);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 60_000,
      maxWait: 10_000,
    });
  });

  it('creates provisioned assets on first apply', async () => {
    const { service, tx } = buildMocks();
    await service.apply(businessId, snapshotId, 'actor-1');

    expect(tx.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: businessId },
        data: expect.objectContaining({ snapshotId }),
      }),
    );
    expect(tx.pipeline.create).toHaveBeenCalled();
    expect(tx.service.create).toHaveBeenCalled();
    expect(tx.tag.create).toHaveBeenCalled();
    expect(tx.calendar.create).toHaveBeenCalled();
    expect(tx.chatbot.create).toHaveBeenCalled();
    expect(tx.emailTemplate.create).toHaveBeenCalled();
  });

  it('skips reprovision on idempotent re-apply', async () => {
    const { service, tx } = buildMocks();
    await service.apply(businessId, snapshotId);
    const pipelineCreates = tx.pipeline.create.mock.calls.length;

    await service.apply(businessId, snapshotId);
    expect(tx.pipeline.create.mock.calls.length).toBe(pipelineCreates);
  });

  it('does not touch contacts or leads', async () => {
    const { service, tx } = buildMocks();
    await service.apply(businessId, snapshotId);
    expect(tx.contact.findMany).not.toHaveBeenCalled();
    expect(tx.lead.findMany).not.toHaveBeenCalled();
  });
});
