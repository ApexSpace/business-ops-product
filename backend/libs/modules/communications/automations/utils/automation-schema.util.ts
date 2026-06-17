import { z } from 'zod';
import type { SubjectType } from '../types/automation-registry.types';

/** Shared event payload shape for domain-triggered automations. */
export const baseTriggerPayloadSchema = z.object({
  businessId: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectType: z.string(),
  contextEntityId: z.string().uuid().optional(),
  contextEntityType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function triggerPayloadSchema(subjectType: SubjectType) {
  return baseTriggerPayloadSchema.extend({
    subjectType: z.literal(subjectType),
  });
}

export const emptyActionConfigSchema = z.object({});

export const delayActionConfigSchema = z.object({
  durationMs: z.number().int().positive(),
  unit: z.enum(['minutes', 'hours', 'days']).optional(),
  amount: z.number().int().positive().optional(),
});

export const sendEmailActionConfigSchema = z.object({
  templateKey: z.string().optional(),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  to: z.enum(['contact', 'custom']).optional(),
  customTo: z.string().email().optional(),
});

export const tagActionConfigSchema = z.object({
  tagId: z.string().uuid(),
});

export const updateFieldActionConfigSchema = z.object({
  field: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const leadStageActionConfigSchema = z.object({
  stageId: z.string().uuid(),
  pipelineId: z.string().uuid().optional(),
});

export const assignActionConfigSchema = z.object({
  userId: z.string().uuid(),
});

export const createTaskActionConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const createNoteActionConfigSchema = z.object({
  body: z.string().min(1),
});

export const conditionActionConfigSchema = z.object({
  conditionKey: z.string().min(1),
  operator: z.string().min(1),
  value: z.unknown(),
  trueBranchStepId: z.string().uuid().optional(),
  falseBranchStepId: z.string().uuid().optional(),
});

export const webhookOutboundActionConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['POST', 'PUT']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});
