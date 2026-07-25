import { AutomationActionExecutorService } from './automation-action-executor.service';
import { ACTION_CONFIG_FIXTURES } from '../registries/registry.fixtures';
import { ACTION_REGISTRY } from '../registries/action.registry';
import { AUTOMATION_TEST_IDS as ID } from '../registries/automation-test-ids.constant';
import type { AutomationRunContext } from '../types/workflow.types';

describe('AutomationActionExecutorService (implemented actions)', () => {
  const context: AutomationRunContext = {
    businessId: ID.business,
    workflowId: ID.workflow,
    runId: ID.run,
    triggerKey: 'contact.created',
    subjectId: ID.contact,
    subjectType: 'contact',
    contactId: ID.contact,
    leadId: ID.lead,
    appointmentId: ID.appointment,
    invoiceId: ID.invoice,
  };

  const prisma = {
    automationWorkflow: { findUnique: jest.fn() },
    business: { findFirst: jest.fn().mockResolvedValue({ type: 'TENANT' }) },
    platformMembership: { findMany: jest.fn().mockResolvedValue([]) },
    contactTag: { findFirst: jest.fn(), create: jest.fn() },
    pipelineStage: { findFirst: jest.fn() },
  };
  const customValueResolver = {
    resolve: jest.fn().mockResolvedValue({
      'contact.first_name': 'Jane',
      'business.name': 'Acme',
    }),
  };
  const conditionEvaluator = {
    evaluate: jest.fn().mockResolvedValue(true),
  };
  const emailNotificationService = {
    enqueueTransactionalEmail: jest.fn().mockResolvedValue(undefined),
  };
  const platformSmsSendService = {
    send: jest.fn().mockResolvedValue(undefined),
  };
  const contactRepository = {
    findById: jest.fn().mockResolvedValue({
      id: ID.contact,
      email: 'jane@example.com',
    }),
  };
  const tagRepository = {
    findById: jest.fn().mockResolvedValue({ id: ID.tag, name: 'VIP' }),
  };
  const leadRepository = {
    findByContactId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue({
      id: ID.lead,
      pipelineStageId: ID.stage,
    }),
    create: jest.fn().mockResolvedValue({ id: ID.lead }),
    update: jest.fn().mockResolvedValue({ id: ID.lead }),
  };
  const taskRepository = {
    create: jest.fn().mockResolvedValue({ id: ID.task }),
  };
  const noteRepository = {
    create: jest.fn().mockResolvedValue({ id: ID.note }),
  };
  const membershipRepository = {
    findOwnersAndAdmins: jest
      .fn()
      .mockResolvedValue([{ user: { email: 'owner@example.com' } }]),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const businessLifecycleService = {
    createFromLead: jest.fn().mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      lifecycleStage: 'LEAD',
    }),
  };

  const service = new AutomationActionExecutorService(
    prisma as never,
    customValueResolver as never,
    conditionEvaluator as never,
    emailNotificationService as never,
    platformSmsSendService as never,
    contactRepository as never,
    tagRepository as never,
    leadRepository as never,
    taskRepository as never,
    noteRepository as never,
    membershipRepository as never,
    auditService as never,
    businessLifecycleService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.automationWorkflow.findUnique.mockResolvedValue({
      settings: { timeWindowEnabled: false },
    });
    prisma.pipelineStage.findFirst.mockResolvedValue({
      id: ID.stage,
      pipelineId: ID.pipeline,
      businessId: ID.business,
    });
    prisma.contactTag.findFirst.mockResolvedValue(null);
    customValueResolver.resolve.mockResolvedValue({
      'contact.first_name': 'Jane',
      'business.name': 'Acme',
    });
    conditionEvaluator.evaluate.mockResolvedValue(true);
  });

  const implementedActions = ACTION_REGISTRY.filter(
    (action) => action.implementationStatus === 'implemented',
  );

  it.each(implementedActions.map((action) => [action.key, action.key]))(
    'executes %s without throwing',
    async (actionKey) => {
      const config = {
        ...(ACTION_CONFIG_FIXTURES[actionKey] ?? {}),
      };

      const result = await service.execute(
        actionKey,
        config,
        actionKey === 'lead.move_stage'
          ? {
              ...context,
              subjectType: 'lead',
              subjectId: ID.lead,
              leadId: ID.lead,
            }
          : context,
        ID.user,
      );

      expect(result).toBeDefined();
      expect(['continue', 'delay', 'delay_current', 'branch', 'end']).toContain(
        result.type,
      );
    },
  );

  it('workflow.condition returns branch when trueBranchStepId is set', async () => {
    const result = await service.execute(
      'workflow.condition',
      ACTION_CONFIG_FIXTURES['workflow.condition'] as Record<string, unknown>,
      context,
      ID.user,
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: 'branch',
        nextStepId: ID.stepTrue,
      }),
    );
  });

  it('workflow.delay returns delay result', async () => {
    const result = await service.execute(
      'workflow.delay',
      ACTION_CONFIG_FIXTURES['workflow.delay'] as Record<string, unknown>,
      context,
      ID.user,
    );

    expect(result.type).toBe('delay');
    if (result.type === 'delay') {
      expect(result.delayMs).toBeGreaterThan(0);
    }
  });

  it('send_internal_email uses platform membership emails for INTERNAL ops', async () => {
    prisma.business.findFirst.mockResolvedValue({ type: 'INTERNAL' });
    prisma.platformMembership.findMany.mockResolvedValue([
      { user: { email: 'admin@codesol.test' } },
      { user: { email: 'support@codesol.test' } },
    ]);

    const result = await service.execute(
      'communication.send_internal_email',
      ACTION_CONFIG_FIXTURES[
        'communication.send_internal_email'
      ] as Record<string, unknown>,
      context,
      ID.user,
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: 'continue',
        output: expect.objectContaining({ recipientCount: 2 }),
      }),
    );
    expect(membershipRepository.findOwnersAndAdmins).not.toHaveBeenCalled();
    expect(emailNotificationService.enqueueTransactionalEmail).toHaveBeenCalledTimes(
      2,
    );
    expect(
      emailNotificationService.enqueueTransactionalEmail.mock.calls.map(
        (call: [{ toEmail: string }]) => call[0].toEmail,
      ),
    ).toEqual(['admin@codesol.test', 'support@codesol.test']);
  });

  it('send_internal_email fails loud when INTERNAL has no platform admin emails', async () => {
    prisma.business.findFirst.mockResolvedValue({ type: 'INTERNAL' });
    prisma.platformMembership.findMany.mockResolvedValue([]);

    await expect(
      service.execute(
        'communication.send_internal_email',
        ACTION_CONFIG_FIXTURES[
          'communication.send_internal_email'
        ] as Record<string, unknown>,
        context,
        ID.user,
      ),
    ).rejects.toThrow(/No platform admin emails/);
  });
});
