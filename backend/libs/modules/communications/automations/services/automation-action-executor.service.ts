import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { htmlToPlainText } from '@app/common/utils/html-text.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { resolveEmailConfig } from '@app/core/config/email/email.config';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { resolveTransactionalEmailSender } from '@app/modules/communications/email/utils/email-sender.util';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { TagRepository } from '@app/modules/crm/contacts/repositories/tag.repository';
import { LeadRepository } from '@app/modules/crm/leads/repositories/lead.repository';
import { NoteRepository } from '@app/modules/crm/notes/repositories/note.repository';
import { TaskRepository } from '@app/modules/operations/tasks/repositories/task.repository';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { ACTION_BY_KEY } from '../registries/action.registry';
import type { AutomationRunContext } from '../types/workflow.types';
import { CustomValueResolverService } from './custom-value-resolver.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import {
  automationAuditMetadata,
  resolveAutomationActorUserId,
} from '../utils/automation-system-actor.util';
import {
  extractMergeTagKeys,
  interpolateMergeTags,
} from '../utils/merge-tag-interpolate.util';
import { parseWorkflowSettings } from '../mappers/automation-workflow.mapper';
import { msUntilAllowedTimeWindow } from '../utils/workflow-time-window.util';

export type ActionExecutionResult =
  | { type: 'continue'; output?: Record<string, unknown> }
  | { type: 'delay'; delayMs: number; output?: Record<string, unknown> }
  | {
      type: 'delay_current';
      delayMs: number;
      output?: Record<string, unknown>;
    }
  | {
      type: 'branch';
      nextStepId: string;
      output?: Record<string, unknown>;
      delayMs?: number;
    }
  | { type: 'end'; output?: Record<string, unknown> };

@Injectable()
export class AutomationActionExecutorService {
  private readonly logger = new Logger(AutomationActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customValueResolver: CustomValueResolverService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly contactRepository: ContactRepository,
    private readonly tagRepository: TagRepository,
    private readonly leadRepository: LeadRepository,
    private readonly taskRepository: TaskRepository,
    private readonly noteRepository: NoteRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    actionKey: string,
    config: Record<string, unknown>,
    context: AutomationRunContext,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    const action = ACTION_BY_KEY[actionKey];
    if (!action || action.implementationStatus !== 'implemented') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Action not implemented: ${actionKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = action.configSchema.safeParse(config);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Invalid action config: ${parsed.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    switch (actionKey) {
      case 'communication.send_email':
        return this.sendEmail(
          parsed.data as {
            subject: string;
            htmlBody: string;
            textBody?: string;
            fromName?: string;
            to?: 'contact' | 'custom';
            customTo?: string;
          },
          context,
          false,
          workflowCreatedById,
        );
      case 'communication.send_internal_email':
        return this.sendEmail(
          parsed.data as {
            subject: string;
            htmlBody: string;
            textBody?: string;
            fromName?: string;
            to?: 'contact' | 'custom';
            customTo?: string;
          },
          context,
          true,
          workflowCreatedById,
        );
      case 'contact.add_tag':
        return this.addTag(
          parsed.data as { tagId: string },
          context,
          workflowCreatedById,
        );
      case 'lead.create':
        return this.createLead(
          parsed.data as { stageId: string; pipelineId?: string },
          context,
          workflowCreatedById,
        );
      case 'lead.move_stage':
        return this.moveLeadStage(
          parsed.data as { stageId: string },
          context,
          workflowCreatedById,
        );
      case 'task.create':
        return this.createTask(
          parsed.data as {
            title: string;
            description?: string;
            dueDate?: string;
            assigneeId?: string;
          },
          context,
          workflowCreatedById,
        );
      case 'note.create':
        return this.createNote(
          parsed.data as { body: string },
          context,
          workflowCreatedById,
        );
      case 'workflow.delay':
        return this.delay(
          parsed.data as {
            durationMs?: number;
            unit?: 'minutes' | 'hours' | 'days';
            amount?: number;
          },
        );
      case 'workflow.condition':
        return this.evaluateCondition(
          parsed.data as {
            conditionKey: string;
            operator: string;
            value: unknown;
            trueBranchStepId?: string;
            falseBranchStepId?: string;
          },
          context,
        );
      case 'workflow.end':
        return { type: 'end' };
      default:
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `Unsupported action: ${actionKey}`,
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  private async resolveMergeValues(
    context: AutomationRunContext,
    templates: string[],
  ): Promise<Record<string, string>> {
    const keys = new Set<string>();
    for (const template of templates) {
      for (const key of extractMergeTagKeys(template)) {
        keys.add(key);
      }
    }

    return this.customValueResolver.resolve(
      {
        businessId: context.businessId,
        contactId: context.contactId,
        leadId: context.leadId,
        appointmentId: context.appointmentId,
        invoiceId: context.invoiceId,
        conversationId:
          context.subjectType === 'conversation' ? context.subjectId : undefined,
        formId: context.subjectType === 'form' ? context.subjectId : undefined,
        submissionId: context.contextEntityId,
      },
      keys.size > 0 ? [...keys] : undefined,
    );
  }

  private async sendEmail(
    config: {
      subject: string;
      htmlBody: string;
      textBody?: string;
      fromName?: string;
      to?: 'contact' | 'custom';
      customTo?: string;
    },
    context: AutomationRunContext,
    internal: boolean,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    const mergeValues = await this.resolveMergeValues(context, [
      config.subject,
      config.htmlBody,
      config.textBody ?? '',
      config.fromName ?? '',
    ]);

    const subject = interpolateMergeTags(config.subject, mergeValues);
    const htmlBody = interpolateMergeTags(config.htmlBody, mergeValues);
    const textBody = config.textBody
      ? interpolateMergeTags(config.textBody, mergeValues)
      : htmlToPlainText(htmlBody);
    const stepFromName = config.fromName
      ? interpolateMergeTags(config.fromName, mergeValues).trim() || undefined
      : undefined;

    const settings = parseWorkflowSettings(
      (
        await this.prisma.automationWorkflow.findUnique({
          where: { id: context.workflowId },
          select: { settings: true },
        })
      )?.settings,
    );

    const windowDelay = msUntilAllowedTimeWindow(settings);
    if (windowDelay > 0) {
      return {
        type: 'delay_current',
        delayMs: windowDelay,
        output: { waitingForTimeWindow: true },
      };
    }

    const recipients: string[] = [];
    if (internal) {
      const members = await this.membershipRepository.findOwnersAndAdmins(
        context.businessId,
      );
      for (const member of members) {
        if (member.user.email) {
          recipients.push(member.user.email);
        }
      }
    } else if (config.to === 'custom' && config.customTo) {
      recipients.push(interpolateMergeTags(config.customTo, mergeValues));
    } else if (context.contactId) {
      const contact = await this.contactRepository.findById(
        context.businessId,
        context.contactId,
      );
      if (contact?.email) {
        recipients.push(contact.email);
      }
    }

    if (recipients.length === 0) {
      this.logger.warn(`No email recipients for automation run ${context.runId}`);
      return { type: 'continue', output: { skipped: true } };
    }

    const sender = resolveTransactionalEmailSender({
      fromEmail: settings.senderFromEmail,
      fromName: settings.senderFromName,
      stepFromName,
      defaultFrom: resolveEmailConfig().defaultFrom,
    });

    for (const toEmail of recipients) {
      await this.emailNotificationService.enqueueTransactionalEmail({
        businessId: context.businessId,
        emailType: 'automation.workflow',
        toEmail,
        variables: mergeValues,
        contactId: context.contactId,
        entityType: 'AutomationWorkflowRun',
        entityId: context.runId,
        idempotencyKey: `automation-${context.runId}-${toEmail}-${subject.slice(0, 40)}`,
        metadata: automationAuditMetadata(context.runId, context.workflowId),
        fromEmail: sender.email ?? undefined,
        fromName: sender.name ?? undefined,
        templateOverride: {
          subject,
          htmlBody,
          textBody,
        },
      });
    }

    return {
      type: 'continue',
      output: {
        recipientCount: recipients.length,
        fromEmail: sender.email,
        fromName: sender.name,
        usedDefaultSender: sender.usedDefaultSender,
        usedStepFromName: sender.usedStepFromName,
      },
    };
  }

  private async evaluateCondition(
    config: {
      conditionKey: string;
      operator: string;
      value: unknown;
      trueBranchStepId?: string;
      falseBranchStepId?: string;
    },
    context: AutomationRunContext,
  ): Promise<ActionExecutionResult> {
    const passed = await this.conditionEvaluator.evaluate(
      context,
      config.conditionKey,
      config.operator,
      config.value,
    );

    const output = {
      conditionKey: config.conditionKey,
      passed,
    };

    if (passed) {
      if (config.trueBranchStepId) {
        return {
          type: 'branch',
          nextStepId: config.trueBranchStepId,
          output,
        };
      }
      return { type: 'continue', output };
    }

    if (config.falseBranchStepId) {
      return {
        type: 'branch',
        nextStepId: config.falseBranchStepId,
        output,
      };
    }

    return { type: 'continue', output: { ...output, skipped: true } };
  }

  private async addTag(
    config: { tagId: string },
    context: AutomationRunContext,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    if (!context.contactId) {
      return { type: 'continue', output: { skipped: true, reason: 'no_contact' } };
    }

    const tag = await this.tagRepository.findById(
      context.businessId,
      config.tagId,
    );
    if (!tag) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Tag not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existing = await this.prisma.contactTag.findFirst({
      where: { contactId: context.contactId, tagId: config.tagId },
    });
    if (!existing) {
      await this.prisma.contactTag.create({
        data: { contactId: context.contactId, tagId: config.tagId },
      });

      await this.auditService.log({
          actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
          businessId: context.businessId,
          action: 'contact.tag_added',
          entityType: 'Contact',
          entityId: context.contactId,
          metadata: {
            ...automationAuditMetadata(context.runId, context.workflowId),
            tagId: config.tagId,
            tagName: tag.name,
            source: 'automation',
          },
        });
    }

    return { type: 'continue', output: { tagId: config.tagId } };
  }

  private async createLead(
    config: { stageId: string; pipelineId?: string },
    context: AutomationRunContext,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    if (!context.contactId) {
      return { type: 'continue', output: { skipped: true, reason: 'no_contact' } };
    }

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: config.stageId, businessId: context.businessId },
    });
    if (!stage) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Pipeline stage not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const actorId = await resolveAutomationActorUserId(
      this.prisma,
      workflowCreatedById,
    );
    if (!actorId) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Automation actor not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const existing = await this.leadRepository.findByContactId(
      context.businessId,
      context.contactId,
    );
    if (existing && !existing.deletedAt) {
      return { type: 'continue', output: { leadId: existing.id, skipped: true } };
    }

    const lead = await this.leadRepository.create(
      context.businessId,
      {
        contactId: context.contactId,
        pipelineId: stage.pipelineId,
        pipelineStageId: stage.id,
        title: null,
        value: null,
        source: 'automation',
        assignedToId: null,
        serviceId: null,
      },
      actorId,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: context.businessId,
      action: 'lead.created_from_contact',
      entityType: 'Lead',
      entityId: lead.id,
      metadata: {
        ...automationAuditMetadata(context.runId, context.workflowId),
        contactId: context.contactId,
        pipelineStageId: stage.id,
      },
    });

    return { type: 'continue', output: { leadId: lead.id } };
  }

  private async moveLeadStage(
    config: { stageId: string },
    context: AutomationRunContext,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    const leadId =
      context.leadId ??
      (context.subjectType === 'lead' ? context.subjectId : undefined);
    if (!leadId) {
      return { type: 'continue', output: { skipped: true, reason: 'no_lead' } };
    }

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: config.stageId, businessId: context.businessId },
    });
    if (!stage) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Pipeline stage not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existing = await this.leadRepository.findById(
      context.businessId,
      leadId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const lead = await this.leadRepository.update(context.businessId, leadId, {
      pipelineStage: { connect: { id: config.stageId } },
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: context.businessId,
      action: 'lead.moved',
      entityType: 'Lead',
      entityId: leadId,
      metadata: {
        ...automationAuditMetadata(context.runId, context.workflowId),
        fromStageId: existing.pipelineStageId,
        toStageId: config.stageId,
      },
    });

    return { type: 'continue', output: { leadId: lead?.id, stageId: config.stageId } };
  }

  private async createTask(
    config: {
      title: string;
      description?: string;
      dueDate?: string;
      assigneeId?: string;
    },
    context: AutomationRunContext,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    const actorId = await resolveAutomationActorUserId(
      this.prisma,
      workflowCreatedById,
    );
    if (!actorId) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Automation actor not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const mergeValues = await this.resolveMergeValues(context, [
      config.title,
      config.description ?? '',
    ]);
    const title = interpolateMergeTags(config.title, mergeValues).trim();
    const description = interpolateMergeTags(
      config.description ?? '',
      mergeValues,
    );
    const dueAt = config.dueDate
      ? new Date(config.dueDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const task = await this.taskRepository.create(
      context.businessId,
      {
        contactId: context.contactId ?? null,
        leadId: context.leadId ?? null,
        title,
        description,
        descriptionText: htmlToPlainText(description),
        dueAt,
        assignedToId: config.assigneeId ?? null,
      },
      actorId,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: context.businessId,
      action: 'task.created',
      entityType: 'Task',
      entityId: task.id,
      metadata: automationAuditMetadata(context.runId, context.workflowId),
    });

    return { type: 'continue', output: { taskId: task.id } };
  }

  private async createNote(
    config: { body: string },
    context: AutomationRunContext,
    workflowCreatedById?: string | null,
  ): Promise<ActionExecutionResult> {
    if (!context.contactId && !context.leadId) {
      return { type: 'continue', output: { skipped: true, reason: 'no_link' } };
    }

    const actorId = await resolveAutomationActorUserId(
      this.prisma,
      workflowCreatedById,
    );
    if (!actorId) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Automation actor not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const mergeValues = await this.resolveMergeValues(context, [config.body]);
    const body = interpolateMergeTags(config.body, mergeValues).trim();
    const title = body.slice(0, 120) || 'Automation note';

    const note = await this.noteRepository.create(
      context.businessId,
      {
        contactId: context.contactId ?? null,
        leadId: context.leadId ?? null,
        title,
        description: body,
        descriptionText: htmlToPlainText(body),
      },
      actorId,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: context.businessId,
      action: 'note.created',
      entityType: 'Note',
      entityId: note.id,
      metadata: automationAuditMetadata(context.runId, context.workflowId),
    });

    return { type: 'continue', output: { noteId: note.id } };
  }

  private delay(config: {
    durationMs?: number;
    unit?: 'minutes' | 'hours' | 'days';
    amount?: number;
  }): ActionExecutionResult {
    let delayMs = config.durationMs ?? 0;
    if (!delayMs && config.amount && config.unit) {
      const multipliers = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
      delayMs = config.amount * multipliers[config.unit];
    }
    if (delayMs <= 0) {
      delayMs = 60_000;
    }
    return { type: 'delay', delayMs };
  }
}
