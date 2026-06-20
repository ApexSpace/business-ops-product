import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus, AutomationWorkflowStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { parseWorkflowTriggerFilters } from '../mappers/automation-workflow.mapper';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';
import { evaluateWorkflowTriggerFilters } from '../utils/workflow-filter.util';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationWorkflowRunRepository } from '../repositories/automation-workflow.repository';

const CRON_WINDOW_MS = 60_000;

@Injectable()
export class AutomationAppointmentTriggerService {
  private readonly logger = new Logger(
    AutomationAppointmentTriggerService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: AutomationEngineService,
    private readonly runRepository: AutomationWorkflowRunRepository,
  ) {}

  async processBeforeStartTriggers(): Promise<void> {
    const now = new Date();
    const workflows = await this.prisma.automationWorkflow.findMany({
      where: {
        deletedAt: null,
        status: AutomationWorkflowStatus.ACTIVE,
        triggerKey: 'appointment.before_start',
      },
      select: {
        id: true,
        businessId: true,
        triggerFilters: true,
      },
    });

    if (workflows.length === 0) {
      return;
    }

    const workflowsByBusiness = new Map<string, typeof workflows>();
    for (const workflow of workflows) {
      const bucket = workflowsByBusiness.get(workflow.businessId) ?? [];
      bucket.push(workflow);
      workflowsByBusiness.set(workflow.businessId, bucket);
    }

    let published = 0;

    for (const [businessId, businessWorkflows] of workflowsByBusiness) {
      const minOffset = Math.min(
        ...businessWorkflows.map((workflow) => {
          const filters = parseWorkflowTriggerFilters(workflow.triggerFilters);
          const offsetFilter = filters.find(
            (f) => f.fieldKey === 'offsetMinutes',
          );
          return Math.max(1, Number(offsetFilter?.value ?? 60));
        }),
      );
      const maxOffset = Math.max(
        ...businessWorkflows.map((workflow) => {
          const filters = parseWorkflowTriggerFilters(workflow.triggerFilters);
          const offsetFilter = filters.find(
            (f) => f.fieldKey === 'offsetMinutes',
          );
          return Math.max(1, Number(offsetFilter?.value ?? 60));
        }),
      );

      const earliestTarget = new Date(now.getTime() + minOffset * 60_000);
      const latestWindowEnd = new Date(
        now.getTime() + (maxOffset + 1) * 60_000,
      );

      const appointments = await this.prisma.appointment.findMany({
        where: {
          businessId,
          deletedAt: null,
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
          startAt: {
            gte: earliestTarget,
            lt: latestWindowEnd,
          },
        },
        select: {
          id: true,
          businessId: true,
          contactId: true,
          calendarId: true,
          status: true,
          startAt: true,
        },
      });

      for (const appointment of appointments) {
        const matchingWorkflows = businessWorkflows.filter((workflow) => {
          const filters = parseWorkflowTriggerFilters(workflow.triggerFilters);
          const offsetFilter = filters.find(
            (f) => f.fieldKey === 'offsetMinutes',
          );
          const offsetMinutes = Math.max(1, Number(offsetFilter?.value ?? 60));
          const targetStart = new Date(now.getTime() + offsetMinutes * 60_000);
          const windowEnd = new Date(targetStart.getTime() + CRON_WINDOW_MS);
          if (
            appointment.startAt < targetStart ||
            appointment.startAt >= windowEnd
          ) {
            return false;
          }

          const metadata = {
            offsetMinutes,
            startsAt: appointment.startAt.toISOString(),
            status: appointment.status.toLowerCase(),
            calendarId: appointment.calendarId,
          };
          return evaluateWorkflowTriggerFilters(filters, metadata);
        });

        if (matchingWorkflows.length === 0) {
          continue;
        }

        const pendingWorkflows = [];
        for (const workflow of matchingWorkflows) {
          const existing = await this.runRepository.hasAnyRun({
            businessId,
            workflowId: workflow.id,
            subjectId: appointment.id,
            triggerKey: 'appointment.before_start',
          });
          if (!existing) {
            pendingWorkflows.push(workflow);
          }
        }

        if (pendingWorkflows.length === 0) {
          continue;
        }

        const primaryWorkflow = pendingWorkflows[0];
        const filters = parseWorkflowTriggerFilters(
          primaryWorkflow.triggerFilters,
        );
        const offsetFilter = filters.find(
          (f) => f.fieldKey === 'offsetMinutes',
        );
        const offsetMinutes = Math.max(1, Number(offsetFilter?.value ?? 60));

        const event: AutomationDomainEventPayload = {
          triggerKey: 'appointment.before_start',
          businessId: appointment.businessId,
          subjectId: appointment.id,
          subjectType: 'appointment',
          contextEntityId: appointment.contactId ?? undefined,
          contextEntityType: appointment.contactId ? 'contact' : undefined,
          metadata: {
            offsetMinutes,
            startsAt: appointment.startAt.toISOString(),
            status: appointment.status.toLowerCase(),
            calendarId: appointment.calendarId,
          },
          auditAction: 'scheduler.appointment.before_start',
          auditEntityType: 'Appointment',
          auditEntityId: appointment.id,
          occurredAt: now.toISOString(),
        };

        await this.engineService.handleDomainEvent(event);
        published += pendingWorkflows.length;
      }
    }

    if (published > 0) {
      this.logger.log(
        `Processed appointment.before_start triggers: ${published} enrollment(s)`,
      );
    }
  }
}
