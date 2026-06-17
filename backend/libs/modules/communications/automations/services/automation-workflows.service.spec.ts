import { AutomationWorkflowStatus } from '@prisma/client';
import { AutomationWorkflowsService } from './automation-workflows.service';

describe('AutomationWorkflowsService', () => {
  const workflow = {
    id: 'wf-1',
    businessId: 'biz-1',
    name: 'Test',
    description: null,
    status: AutomationWorkflowStatus.DRAFT,
    triggerKey: 'contact.created',
    triggerFilters: [],
    steps: [{ id: 'step-1', actionKey: 'workflow.end', config: {} }],
    settings: {},
    isSystemTemplate: false,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
  };

  const workflowRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const runRepository = { findMany: jest.fn(), findById: jest.fn() };
  const auditService = { log: jest.fn() };

  const actor = {
    id: 'user-1',
    businessId: 'biz-1',
    businessRole: 'OWNER',
    context: 'business',
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a workflow and audits', async () => {
    workflowRepository.create.mockResolvedValue(workflow);
    const service = new AutomationWorkflowsService(
      workflowRepository as never,
      runRepository as never,
      auditService as never,
    );

    const result = await service.create(
      'biz-1',
      {
        name: 'Test',
        triggerKey: 'contact.created',
        steps: [{ id: 'step-1', actionKey: 'workflow.end', config: {} }],
      },
      actor as never,
    );

    expect(result.id).toBe('wf-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'automation.workflow.created' }),
    );
  });

  it('blocks activation without steps', async () => {
    workflowRepository.findById.mockResolvedValue({ ...workflow, steps: [] });
    const service = new AutomationWorkflowsService(
      workflowRepository as never,
      runRepository as never,
      auditService as never,
    );

    await expect(
      service.updateStatus(
        'biz-1',
        'wf-1',
        { status: AutomationWorkflowStatus.ACTIVE },
        actor as never,
      ),
    ).rejects.toThrow('at least one step');
  });
});
