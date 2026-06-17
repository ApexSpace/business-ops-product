import { Injectable } from '@nestjs/common';
import {
  AutomationWorkflowRunStatus,
  AutomationWorkflowRunStepStatus,
  AutomationWorkflowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  WorkflowSettings,
  WorkflowStepDefinition,
  WorkflowTriggerFilter,
} from '../types/workflow.types';
import { DEFAULT_WORKFLOW_SETTINGS } from '../types/workflow.types';

const workflowInclude = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.AutomationWorkflowInclude;

export type AutomationWorkflowRecord = Prisma.AutomationWorkflowGetPayload<{
  include: typeof workflowInclude;
}>;

@Injectable()
export class AutomationWorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(businessId: string): Prisma.AutomationWorkflowWhereInput {
    return { businessId, deletedAt: null };
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      status?: AutomationWorkflowStatus;
      search?: string;
      triggerKey?: string;
    },
  ) {
    const where: Prisma.AutomationWorkflowWhereInput = {
      ...this.activeWhere(businessId),
      ...(params.status ? { status: params.status } : {}),
      ...(params.triggerKey ? { triggerKey: params.triggerKey } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              {
                description: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.automationWorkflow.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { updatedAt: 'desc' },
        include: workflowInclude,
      }),
      this.prisma.automationWorkflow.count({ where }),
    ]);
  }

  findById(businessId: string, id: string) {
    return this.prisma.automationWorkflow.findFirst({
      where: { ...this.activeWhere(businessId), id },
      include: workflowInclude,
    });
  }

  findActiveByTrigger(businessId: string, triggerKey: string) {
    return this.prisma.automationWorkflow.findMany({
      where: {
        ...this.activeWhere(businessId),
        triggerKey,
        status: AutomationWorkflowStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(data: {
    businessId: string;
    name: string;
    description?: string | null;
    triggerKey: string;
    triggerFilters?: WorkflowTriggerFilter[] | null;
    steps: WorkflowStepDefinition[];
    settings?: WorkflowSettings;
    isSystemTemplate?: boolean;
    createdById?: string | null;
    status?: AutomationWorkflowStatus;
  }) {
    return this.prisma.automationWorkflow.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        description: data.description ?? null,
        triggerKey: data.triggerKey,
        triggerFilters: data.triggerFilters as unknown as Prisma.InputJsonValue,
        steps: data.steps as unknown as Prisma.InputJsonValue,
        settings: (data.settings ??
          DEFAULT_WORKFLOW_SETTINGS) as unknown as Prisma.InputJsonValue,
        isSystemTemplate: data.isSystemTemplate ?? false,
        createdById: data.createdById ?? null,
        status: data.status ?? AutomationWorkflowStatus.DRAFT,
      },
      include: workflowInclude,
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.AutomationWorkflowUpdateInput,
  ) {
    return this.prisma.automationWorkflow.update({
      where: { id },
      data,
      include: workflowInclude,
    });
  }

  softDelete(businessId: string, id: string) {
    return this.prisma.automationWorkflow.updateMany({
      where: { ...this.activeWhere(businessId), id },
      data: {
        deletedAt: new Date(),
        status: AutomationWorkflowStatus.INACTIVE,
      },
    });
  }
}

@Injectable()
export class AutomationWorkflowRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      workflowId?: string;
      contactId?: string;
      status?: AutomationWorkflowRunStatus;
    },
  ) {
    const where: Prisma.AutomationWorkflowRunWhereInput = {
      businessId,
      ...(params.workflowId ? { workflowId: params.workflowId } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    return this.prisma.$transaction([
      this.prisma.automationWorkflowRun.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: { select: { id: true, name: true, triggerKey: true } },
          steps: { orderBy: { stepIndex: 'asc' } },
        },
      }),
      this.prisma.automationWorkflowRun.count({ where }),
    ]);
  }

  findById(businessId: string, id: string) {
    return this.prisma.automationWorkflowRun.findFirst({
      where: { businessId, id },
      include: {
        workflow: true,
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });
  }

  findRunById(id: string) {
    return this.prisma.automationWorkflowRun.findUnique({
      where: { id },
      include: {
        workflow: true,
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });
  }

  hasCompletedRun(params: {
    businessId: string;
    workflowId: string;
    subjectId?: string;
    contextEntityId?: string;
  }) {
    return this.prisma.automationWorkflowRun.findFirst({
      where: {
        businessId: params.businessId,
        workflowId: params.workflowId,
        status: AutomationWorkflowRunStatus.COMPLETED,
        ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        ...(params.contextEntityId
          ? { contextEntityId: params.contextEntityId }
          : {}),
      },
      select: { id: true },
    });
  }

  create(data: {
    businessId: string;
    workflowId: string;
    triggerKey: string;
    subjectId: string;
    subjectType: string;
    contextEntityId?: string | null;
    contextEntityType?: string | null;
    contactId?: string | null;
    enrollmentReason?: string | null;
    metadata?: Record<string, unknown>;
    steps: Array<{
      stepIndex: number;
      actionKey: string;
      config: Record<string, unknown>;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.automationWorkflowRun.create({
        data: {
          businessId: data.businessId,
          workflowId: data.workflowId,
          triggerKey: data.triggerKey,
          subjectId: data.subjectId,
          subjectType: data.subjectType,
          contextEntityId: data.contextEntityId ?? null,
          contextEntityType: data.contextEntityType ?? null,
          contactId: data.contactId ?? null,
          enrollmentReason: data.enrollmentReason ?? null,
          metadata: data.metadata as Prisma.InputJsonValue,
          status: AutomationWorkflowRunStatus.RUNNING,
        },
      });

      if (data.steps.length > 0) {
        await tx.automationWorkflowRunStep.createMany({
          data: data.steps.map((step) => ({
            businessId: data.businessId,
            runId: run.id,
            stepIndex: step.stepIndex,
            actionKey: step.actionKey,
            config: step.config as Prisma.InputJsonValue,
            status: AutomationWorkflowRunStepStatus.PENDING,
          })),
        });
      }

      return tx.automationWorkflowRun.findUniqueOrThrow({
        where: { id: run.id },
        include: { steps: { orderBy: { stepIndex: 'asc' } }, workflow: true },
      });
    });
  }

  updateRun(id: string, data: Prisma.AutomationWorkflowRunUpdateInput) {
    return this.prisma.automationWorkflowRun.update({
      where: { id },
      data,
      include: { steps: { orderBy: { stepIndex: 'asc' } }, workflow: true },
    });
  }

  updateStep(
    runId: string,
    stepIndex: number,
    data: Prisma.AutomationWorkflowRunStepUpdateInput,
  ) {
    return this.prisma.automationWorkflowRunStep.update({
      where: { runId_stepIndex: { runId, stepIndex } },
      data,
    });
  }

  getStep(runId: string, stepIndex: number) {
    return this.prisma.automationWorkflowRunStep.findUnique({
      where: { runId_stepIndex: { runId, stepIndex } },
    });
  }
}
