import { z } from 'zod';
import type {
  AutomationCategoryKey,
  ImplementationStatus,
  SubjectType,
  TriggerDefinition,
  TriggerFilterField,
} from '../types/automation-registry.types';
import {
  baseTriggerPayloadSchema,
  triggerPayloadSchema,
} from '../utils/automation-schema.util';

type TriggerInput = Omit<TriggerDefinition, 'payloadSchema'> & {
  payloadSchema?: z.ZodTypeAny;
};

function trig(input: TriggerInput): TriggerDefinition {
  return {
    ...input,
    payloadSchema:
      input.payloadSchema ?? triggerPayloadSchema(input.subjectType),
  };
}

const statusFilter: TriggerFilterField = {
  key: 'status',
  label: 'Status',
  type: 'enum',
  enumValues: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
};

const appointmentStatuses = ['completed', 'cancelled'] as const;

function statusFilteredAppointmentTrigger(
  key: string,
  label: string,
  description: string,
  status: (typeof appointmentStatuses)[number],
  implementationStatus: ImplementationStatus,
): TriggerDefinition {
  return trig({
    key,
    category: 'appointment',
    label,
    description,
    icon: 'calendar',
    implementationStatus,
    auditAction:
      implementationStatus === 'implemented'
        ? 'appointment.status_changed'
        : undefined,
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    filterFields: [statusFilter],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
      'service',
    ],
    payloadSchema: triggerPayloadSchema('appointment').extend({
      metadata: z
        .object({
          status: z.literal(status),
          previousStatus: z.string().optional(),
        })
        .optional(),
    }),
  });
}

export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  // Contact (4)
  trig({
    key: 'contact.created',
    category: 'contact',
    label: 'Contact created',
    description: 'Fires when a new contact record is created.',
    icon: 'user-plus',
    implementationStatus: 'implemented',
    auditAction: 'contact.created',
    subjectType: 'contact',
    filterFields: [
      { key: 'contact.has_email', label: 'Has email', type: 'boolean' },
      { key: 'contact.has_phone', label: 'Has phone', type: 'boolean' },
    ],
    availableCustomValueCategories: ['contact', 'business'],
  }),
  trig({
    key: 'contact.updated',
    category: 'contact',
    label: 'Contact updated',
    description: 'Fires when a contact profile is updated.',
    icon: 'user',
    implementationStatus: 'implemented',
    auditAction: 'contact.updated',
    subjectType: 'contact',
    availableCustomValueCategories: ['contact', 'business'],
  }),
  trig({
    key: 'contact.deleted',
    category: 'contact',
    label: 'Contact deleted',
    description: 'Fires when a contact is soft-deleted.',
    icon: 'user-minus',
    implementationStatus: 'implemented',
    auditAction: 'contact.deleted',
    subjectType: 'contact',
  }),
  trig({
    key: 'contact.tag_added',
    category: 'contact',
    label: 'Tag added',
    description: 'Fires when a tag is added to a contact.',
    icon: 'tag',
    implementationStatus: 'implemented',
    auditAction: 'contact.tag_added',
    subjectType: 'contact',
    filterFields: [
      { key: 'tagId', label: 'Tag', type: 'uuid' },
      { key: 'tagName', label: 'Tag name', type: 'string' },
    ],
    availableCustomValueCategories: ['contact', 'business'],
    payloadSchema: triggerPayloadSchema('contact').extend({
      metadata: z
        .object({
          tagId: z.string().uuid(),
          tagName: z.string().optional(),
        })
        .optional(),
    }),
  }),

  // Lead (6)
  trig({
    key: 'lead.created',
    category: 'lead',
    label: 'Lead created',
    description: 'Fires when a new lead is created from a contact.',
    icon: 'target',
    implementationStatus: 'implemented',
    auditAction: 'lead.created_from_contact',
    subjectType: 'lead',
    contextEntityTypes: ['lead', 'contact'],
    availableCustomValueCategories: ['contact', 'lead', 'business'],
  }),
  trig({
    key: 'lead.reactivated',
    category: 'lead',
    label: 'Lead reactivated',
    description: 'Fires when a closed lead is reactivated.',
    icon: 'refresh-cw',
    implementationStatus: 'implemented',
    auditAction: 'lead.reactivated_from_contact',
    subjectType: 'lead',
    contextEntityTypes: ['lead', 'contact'],
    availableCustomValueCategories: ['contact', 'lead', 'business'],
  }),
  trig({
    key: 'lead.updated',
    category: 'lead',
    label: 'Lead updated',
    description: 'Fires when lead details are updated.',
    icon: 'edit',
    implementationStatus: 'implemented',
    auditAction: 'lead.updated',
    subjectType: 'lead',
    contextEntityTypes: ['lead', 'contact'],
    availableCustomValueCategories: ['contact', 'lead', 'business'],
  }),
  trig({
    key: 'lead.stage_changed',
    category: 'lead',
    label: 'Stage changed',
    description: 'Fires when a lead moves to a different pipeline stage.',
    icon: 'git-branch',
    implementationStatus: 'implemented',
    auditAction: 'lead.moved',
    subjectType: 'lead',
    contextEntityTypes: ['lead', 'contact'],
    filterFields: [
      { key: 'stageId', label: 'Stage', type: 'uuid' },
      { key: 'pipelineId', label: 'Pipeline', type: 'uuid' },
    ],
    availableCustomValueCategories: ['contact', 'lead', 'business'],
    payloadSchema: triggerPayloadSchema('lead').extend({
      metadata: z
        .object({
          stageId: z.string().uuid(),
          previousStageId: z.string().uuid().optional(),
          pipelineId: z.string().uuid().optional(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'lead.assigned',
    category: 'lead',
    label: 'Lead assigned',
    description: 'Fires when a lead is assigned to a team member.',
    icon: 'user-check',
    implementationStatus: 'implemented',
    auditAction: 'lead.assigned',
    subjectType: 'lead',
    contextEntityTypes: ['lead', 'contact'],
    filterFields: [{ key: 'assigneeId', label: 'Assignee', type: 'uuid' }],
    availableCustomValueCategories: ['contact', 'lead', 'user', 'business'],
    payloadSchema: triggerPayloadSchema('lead').extend({
      metadata: z
        .object({
          assigneeId: z.string().uuid(),
          previousAssigneeId: z.string().uuid().optional(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'lead.deleted',
    category: 'lead',
    label: 'Lead deleted',
    description: 'Fires when a lead is removed.',
    icon: 'trash',
    implementationStatus: 'implemented',
    auditAction: 'lead.deleted',
    subjectType: 'lead',
    contextEntityTypes: ['lead', 'contact'],
  }),

  // Appointment (9)
  trig({
    key: 'appointment.booked',
    category: 'appointment',
    label: 'Appointment booked',
    description: 'Fires when a staff member books an appointment.',
    icon: 'calendar-plus',
    implementationStatus: 'implemented',
    auditAction: 'appointment.created',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
      'service',
    ],
  }),
  trig({
    key: 'appointment.booked_online',
    category: 'appointment',
    label: 'Booked online',
    description: 'Fires when a customer books via public booking.',
    icon: 'globe',
    implementationStatus: 'implemented',
    auditAction: 'appointment.public_booked',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
      'service',
    ],
  }),
  trig({
    key: 'appointment.updated',
    category: 'appointment',
    label: 'Appointment updated',
    description: 'Fires when appointment details change.',
    icon: 'calendar',
    implementationStatus: 'implemented',
    auditAction: 'appointment.updated',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
    ],
  }),
  trig({
    key: 'appointment.status_changed',
    category: 'appointment',
    label: 'Status changed',
    description: 'Fires when appointment status changes.',
    icon: 'activity',
    implementationStatus: 'implemented',
    auditAction: 'appointment.status_changed',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    filterFields: [statusFilter],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
    ],
    payloadSchema: triggerPayloadSchema('appointment').extend({
      metadata: z
        .object({
          status: z.string(),
          previousStatus: z.string().optional(),
        })
        .optional(),
    }),
  }),
  statusFilteredAppointmentTrigger(
    'appointment.completed',
    'Appointment completed',
    'Fires when an appointment is marked completed.',
    'completed',
    'planned',
  ),
  statusFilteredAppointmentTrigger(
    'appointment.cancelled',
    'Appointment cancelled',
    'Fires when an appointment is cancelled.',
    'cancelled',
    'planned',
  ),
  trig({
    key: 'appointment.deleted',
    category: 'appointment',
    label: 'Appointment deleted',
    description: 'Fires when an appointment is removed.',
    icon: 'calendar-x',
    implementationStatus: 'implemented',
    auditAction: 'appointment.deleted',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
  }),
  trig({
    key: 'appointment.before_start',
    category: 'appointment',
    label: 'Before appointment starts',
    description: 'Fires on a schedule before the appointment start time.',
    icon: 'alarm-clock',
    implementationStatus: 'implemented',
    auditAction: 'scheduler.appointment.before_start',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    filterFields: [
      {
        key: 'offsetMinutes',
        label: 'Minutes before start',
        type: 'number',
      },
      statusFilter,
    ],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
    ],
    payloadSchema: triggerPayloadSchema('appointment').extend({
      metadata: z
        .object({
          offsetMinutes: z.number().int().positive(),
          startsAt: z.string().datetime(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'appointment.rescheduled',
    category: 'appointment',
    label: 'Appointment rescheduled',
    description: 'Fires when an appointment time is changed.',
    icon: 'calendar-clock',
    implementationStatus: 'planned',
    auditAction: 'appointment.updated',
    subjectType: 'appointment',
    contextEntityTypes: ['appointment', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'appointment',
      'business',
      'calendar',
    ],
    payloadSchema: triggerPayloadSchema('appointment').extend({
      metadata: z
        .object({
          previousStartAt: z.string().datetime(),
          newStartAt: z.string().datetime(),
        })
        .optional(),
    }),
  }),

  // Calendar (3)
  trig({
    key: 'calendar.created',
    category: 'calendar',
    label: 'Calendar created',
    description: 'Fires when a new staff calendar is created.',
    icon: 'calendar',
    implementationStatus: 'implemented',
    auditAction: 'calendar.created',
    subjectType: 'calendar',
    availableCustomValueCategories: ['calendar', 'business'],
  }),
  trig({
    key: 'calendar.updated',
    category: 'calendar',
    label: 'Calendar updated',
    description: 'Fires when calendar settings change.',
    icon: 'settings',
    implementationStatus: 'implemented',
    auditAction: 'calendar.updated',
    subjectType: 'calendar',
    availableCustomValueCategories: ['calendar', 'business'],
  }),
  trig({
    key: 'calendar.availability_changed',
    category: 'calendar',
    label: 'Availability changed',
    description: 'Fires when calendar availability rules are updated.',
    icon: 'clock',
    implementationStatus: 'implemented',
    auditAction: 'calendar.availability_updated',
    subjectType: 'calendar',
    availableCustomValueCategories: ['calendar', 'business'],
  }),

  // Conversation (5)
  trig({
    key: 'conversation.created',
    category: 'conversation',
    label: 'Conversation created',
    description: 'Fires when a new inbox conversation starts.',
    icon: 'message-square-plus',
    implementationStatus: 'implemented',
    auditAction: 'conversation.created',
    subjectType: 'conversation',
    contextEntityTypes: ['conversation', 'contact'],
    availableCustomValueCategories: ['contact', 'conversation', 'business'],
  }),
  trig({
    key: 'conversation.message_received',
    category: 'conversation',
    label: 'Message received',
    description: 'Fires when an inbound message arrives.',
    icon: 'inbox',
    implementationStatus: 'implemented',
    auditAction: 'conversation.message.received',
    subjectType: 'conversation',
    contextEntityTypes: ['conversation', 'contact'],
    filterFields: [
      {
        key: 'channel',
        label: 'Channel',
        type: 'enum',
        enumValues: ['email', 'whatsapp', 'sms', 'chat'],
      },
    ],
    availableCustomValueCategories: ['contact', 'conversation', 'business'],
    payloadSchema: triggerPayloadSchema('conversation').extend({
      metadata: z
        .object({
          channel: z.string(),
          messageId: z.string().uuid().optional(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'conversation.updated',
    category: 'conversation',
    label: 'Conversation updated',
    description: 'Fires when conversation metadata changes.',
    icon: 'message-square',
    implementationStatus: 'implemented',
    auditAction: 'conversation.updated',
    subjectType: 'conversation',
    contextEntityTypes: ['conversation', 'contact'],
    availableCustomValueCategories: ['contact', 'conversation', 'business'],
  }),
  trig({
    key: 'conversation.assigned',
    category: 'conversation',
    label: 'Conversation assigned',
    description: 'Fires when a conversation is assigned to a team member.',
    icon: 'user-check',
    implementationStatus: 'implemented',
    auditAction: 'conversation.assigned',
    subjectType: 'conversation',
    contextEntityTypes: ['conversation', 'contact'],
    filterFields: [{ key: 'assigneeId', label: 'Assignee', type: 'uuid' }],
    availableCustomValueCategories: [
      'contact',
      'conversation',
      'user',
      'business',
    ],
    payloadSchema: triggerPayloadSchema('conversation').extend({
      metadata: z
        .object({
          assigneeId: z.string().uuid(),
          previousAssigneeId: z.string().uuid().optional(),
        })
        .optional(),
    }),
  }),

  // Form (1)
  trig({
    key: 'form.submitted',
    category: 'form',
    label: 'Form submitted',
    description: 'Fires when a public form is submitted.',
    icon: 'clipboard-check',
    implementationStatus: 'implemented',
    auditAction: 'form.submitted',
    subjectType: 'form',
    contextEntityTypes: ['form_submission', 'contact'],
    filterFields: [{ key: 'formId', label: 'Form', type: 'uuid' }],
    availableCustomValueCategories: ['contact', 'form', 'business'],
    payloadSchema: triggerPayloadSchema('form').extend({
      contextEntityType: z.literal('form_submission').optional(),
      metadata: z
        .object({
          formId: z.string().uuid(),
          submissionId: z.string().uuid(),
        })
        .optional(),
    }),
  }),

  // Estimate (4)
  trig({
    key: 'estimate.created',
    category: 'estimate',
    label: 'Estimate created',
    description: 'Fires when a new estimate is created.',
    icon: 'file-plus',
    implementationStatus: 'implemented',
    auditAction: 'estimate.created',
    subjectType: 'estimate',
    contextEntityTypes: ['estimate', 'contact'],
    availableCustomValueCategories: ['contact', 'estimate', 'business'],
  }),
  trig({
    key: 'estimate.updated',
    category: 'estimate',
    label: 'Estimate updated',
    description: 'Fires when estimate details change.',
    icon: 'file-text',
    implementationStatus: 'implemented',
    auditAction: 'estimate.updated',
    subjectType: 'estimate',
    contextEntityTypes: ['estimate', 'contact'],
    availableCustomValueCategories: ['contact', 'estimate', 'business'],
  }),
  trig({
    key: 'estimate.status_changed',
    category: 'estimate',
    label: 'Estimate status changed',
    description: 'Fires when estimate status changes.',
    icon: 'activity',
    implementationStatus: 'implemented',
    auditAction: 'estimate.status_changed',
    subjectType: 'estimate',
    contextEntityTypes: ['estimate', 'contact'],
    filterFields: [
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['draft', 'sent', 'accepted', 'declined', 'expired'],
      },
    ],
    availableCustomValueCategories: ['contact', 'estimate', 'business'],
    payloadSchema: triggerPayloadSchema('estimate').extend({
      metadata: z
        .object({
          status: z.string(),
          previousStatus: z.string().optional(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'estimate.deleted',
    category: 'estimate',
    label: 'Estimate deleted',
    description: 'Fires when an estimate is removed.',
    icon: 'file-x',
    implementationStatus: 'implemented',
    auditAction: 'estimate.deleted',
    subjectType: 'estimate',
    contextEntityTypes: ['estimate', 'contact'],
  }),

  // Invoice (9)
  trig({
    key: 'invoice.created',
    category: 'invoice',
    label: 'Invoice created',
    description: 'Fires when a new invoice is created.',
    icon: 'receipt',
    implementationStatus: 'implemented',
    auditAction: 'invoice.created',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
    availableCustomValueCategories: ['contact', 'invoice', 'business'],
  }),
  trig({
    key: 'invoice.updated',
    category: 'invoice',
    label: 'Invoice updated',
    description: 'Fires when invoice details change.',
    icon: 'edit',
    implementationStatus: 'implemented',
    auditAction: 'invoice.updated',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
    availableCustomValueCategories: ['contact', 'invoice', 'business'],
  }),
  trig({
    key: 'invoice.status_changed',
    category: 'invoice',
    label: 'Invoice status changed',
    description: 'Fires when invoice status changes.',
    icon: 'activity',
    implementationStatus: 'implemented',
    auditAction: 'invoice.status_changed',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
    filterFields: [
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      },
    ],
    availableCustomValueCategories: ['contact', 'invoice', 'business'],
    payloadSchema: triggerPayloadSchema('invoice').extend({
      metadata: z
        .object({
          status: z.string(),
          previousStatus: z.string().optional(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'invoice.sent',
    category: 'invoice',
    label: 'Invoice sent',
    description: 'Fires when an invoice is sent to the customer.',
    icon: 'send',
    implementationStatus: 'planned',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
    availableCustomValueCategories: ['contact', 'invoice', 'business'],
    payloadSchema: triggerPayloadSchema('invoice').extend({
      metadata: z.object({ status: z.literal('sent') }).optional(),
    }),
  }),
  trig({
    key: 'invoice.paid',
    category: 'invoice',
    label: 'Invoice paid',
    description: 'Fires when an invoice is fully paid.',
    icon: 'check-circle',
    implementationStatus: 'implemented',
    auditAction: 'invoice.payment.received',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'payment', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'invoice',
      'payment',
      'business',
    ],
  }),
  trig({
    key: 'invoice.payment_failed',
    category: 'invoice',
    label: 'Payment failed',
    description: 'Fires when an invoice payment attempt fails.',
    icon: 'x-circle',
    implementationStatus: 'implemented',
    auditAction: 'invoice.payment.failed',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
    availableCustomValueCategories: ['contact', 'invoice', 'business'],
  }),
  trig({
    key: 'invoice.payment_link_created',
    category: 'invoice',
    label: 'Payment link created',
    description: 'Fires when an online payment link is generated.',
    icon: 'link',
    implementationStatus: 'implemented',
    auditAction: 'invoice.payment_link.created',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
    availableCustomValueCategories: ['contact', 'invoice', 'business'],
  }),
  trig({
    key: 'invoice.refunded',
    category: 'invoice',
    label: 'Invoice refunded',
    description: 'Fires when an invoice refund is recorded.',
    icon: 'rotate-ccw',
    implementationStatus: 'implemented',
    auditAction: 'invoice.refunded',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'payment', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'invoice',
      'payment',
      'business',
    ],
  }),
  trig({
    key: 'invoice.deleted',
    category: 'invoice',
    label: 'Invoice deleted',
    description: 'Fires when an invoice is removed.',
    icon: 'trash',
    implementationStatus: 'implemented',
    auditAction: 'invoice.deleted',
    subjectType: 'invoice',
    contextEntityTypes: ['invoice', 'contact'],
  }),

  // Payment (2)
  trig({
    key: 'payment.received',
    category: 'payment',
    label: 'Payment received',
    description: 'Fires when a payment is recorded.',
    icon: 'credit-card',
    implementationStatus: 'implemented',
    auditAction: 'payment.created',
    subjectType: 'payment',
    contextEntityTypes: ['payment', 'invoice', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'payment',
      'invoice',
      'business',
    ],
  }),
  trig({
    key: 'payment.refunded',
    category: 'payment',
    label: 'Payment refunded',
    description: 'Fires when a payment refund is recorded.',
    icon: 'rotate-ccw',
    implementationStatus: 'implemented',
    auditAction: 'payment.refunded',
    subjectType: 'payment',
    contextEntityTypes: ['payment', 'invoice', 'contact'],
    availableCustomValueCategories: [
      'contact',
      'payment',
      'invoice',
      'business',
    ],
  }),

  // Task (5)
  trig({
    key: 'task.created',
    category: 'task',
    label: 'Task created',
    description: 'Fires when a new task is created.',
    icon: 'plus-square',
    implementationStatus: 'implemented',
    auditAction: 'task.created',
    subjectType: 'task',
    contextEntityTypes: ['task', 'contact'],
    availableCustomValueCategories: ['contact', 'task', 'business', 'user'],
  }),
  trig({
    key: 'task.updated',
    category: 'task',
    label: 'Task updated',
    description: 'Fires when task details change.',
    icon: 'edit',
    implementationStatus: 'implemented',
    auditAction: 'task.updated',
    subjectType: 'task',
    contextEntityTypes: ['task', 'contact'],
    availableCustomValueCategories: ['contact', 'task', 'business'],
  }),
  trig({
    key: 'task.completed',
    category: 'task',
    label: 'Task completed',
    description: 'Fires when a task is marked complete.',
    icon: 'check-square',
    implementationStatus: 'implemented',
    auditAction: 'task.completed',
    subjectType: 'task',
    contextEntityTypes: ['task', 'contact'],
    availableCustomValueCategories: ['contact', 'task', 'business'],
  }),
  trig({
    key: 'task.reopened',
    category: 'task',
    label: 'Task reopened',
    description: 'Fires when a completed task is reopened.',
    icon: 'rotate-ccw',
    implementationStatus: 'implemented',
    auditAction: 'task.reopened',
    subjectType: 'task',
    contextEntityTypes: ['task', 'contact'],
    availableCustomValueCategories: ['contact', 'task', 'business'],
  }),
  trig({
    key: 'task.deleted',
    category: 'task',
    label: 'Task deleted',
    description: 'Fires when a task is removed.',
    icon: 'trash',
    implementationStatus: 'implemented',
    auditAction: 'task.deleted',
    subjectType: 'task',
    contextEntityTypes: ['task', 'contact'],
  }),

  // Work item (4)
  trig({
    key: 'work_item.created',
    category: 'work_item',
    label: 'Work item created',
    description: 'Fires when a new work item is created.',
    icon: 'briefcase',
    implementationStatus: 'implemented',
    auditAction: 'work_item.created',
    subjectType: 'work_item',
    contextEntityTypes: ['work_item', 'contact'],
    availableCustomValueCategories: ['contact', 'work_item', 'business'],
  }),
  trig({
    key: 'work_item.updated',
    category: 'work_item',
    label: 'Work item updated',
    description: 'Fires when work item details change.',
    icon: 'edit',
    implementationStatus: 'implemented',
    auditAction: 'work_item.updated',
    subjectType: 'work_item',
    contextEntityTypes: ['work_item', 'contact'],
    availableCustomValueCategories: ['contact', 'work_item', 'business'],
  }),
  trig({
    key: 'work_item.status_changed',
    category: 'work_item',
    label: 'Work item status changed',
    description: 'Fires when work item status changes.',
    icon: 'activity',
    implementationStatus: 'implemented',
    auditAction: 'work_item.status_changed',
    subjectType: 'work_item',
    contextEntityTypes: ['work_item', 'contact'],
    filterFields: [
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['open', 'in_progress', 'completed', 'cancelled'],
      },
    ],
    availableCustomValueCategories: ['contact', 'work_item', 'business'],
    payloadSchema: triggerPayloadSchema('work_item').extend({
      metadata: z
        .object({
          status: z.string(),
          previousStatus: z.string().optional(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'work_item.deleted',
    category: 'work_item',
    label: 'Work item deleted',
    description: 'Fires when a work item is removed.',
    icon: 'trash',
    implementationStatus: 'implemented',
    auditAction: 'work_item.deleted',
    subjectType: 'work_item',
    contextEntityTypes: ['work_item', 'contact'],
  }),

  // Note (1)
  trig({
    key: 'note.created',
    category: 'note',
    label: 'Note created',
    description: 'Fires when a CRM note is added.',
    icon: 'sticky-note',
    implementationStatus: 'implemented',
    auditAction: 'note.created',
    subjectType: 'note',
    contextEntityTypes: ['note', 'contact'],
    availableCustomValueCategories: ['contact', 'business', 'user'],
  }),

  // Schedule (2)
  trig({
    key: 'schedule.daily',
    category: 'schedule',
    label: 'Daily schedule',
    description: 'Fires once per day in the business timezone.',
    icon: 'sun',
    implementationStatus: 'planned',
    subjectType: 'schedule',
    filterFields: [
      { key: 'hour', label: 'Hour (0-23)', type: 'number' },
      { key: 'minute', label: 'Minute', type: 'number' },
    ],
    payloadSchema: baseTriggerPayloadSchema.extend({
      subjectType: z.literal('schedule'),
      subjectId: z.string().uuid(),
      metadata: z
        .object({
          hour: z.number().int().min(0).max(23),
          minute: z.number().int().min(0).max(59),
          timezone: z.string(),
        })
        .optional(),
    }),
  }),
  trig({
    key: 'schedule.contact_birthday',
    category: 'schedule',
    label: 'Contact birthday',
    description: 'Fires on a contact birthday (requires birthdate field).',
    icon: 'cake',
    implementationStatus: 'stub',
    subjectType: 'contact',
    availableCustomValueCategories: ['contact', 'business'],
    payloadSchema: triggerPayloadSchema('contact').extend({
      metadata: z
        .object({
          birthdate: z.string(),
        })
        .optional(),
    }),
  }),

  // Integration (2)
  trig({
    key: 'integration.connected',
    category: 'integration',
    label: 'Integration connected',
    description: 'Fires when an integration is connected.',
    icon: 'plug',
    implementationStatus: 'implemented',
    auditAction: 'integration.connected',
    subjectType: 'integration',
    filterFields: [
      {
        key: 'provider',
        label: 'Provider',
        type: 'string',
      },
    ],
    payloadSchema: triggerPayloadSchema('integration').extend({
      metadata: z.object({ provider: z.string() }).optional(),
    }),
  }),
  trig({
    key: 'integration.disconnected',
    category: 'integration',
    label: 'Integration disconnected',
    description: 'Fires when an integration is removed.',
    icon: 'unplug',
    implementationStatus: 'implemented',
    auditAction: 'integration.deleted',
    subjectType: 'integration',
    filterFields: [{ key: 'provider', label: 'Provider', type: 'string' }],
    payloadSchema: triggerPayloadSchema('integration').extend({
      metadata: z.object({ provider: z.string() }).optional(),
    }),
  }),

  // Memberships (5)
  trig({
    key: 'membership.started',
    category: 'finance',
    label: 'Membership started',
    description: 'Fires when a client membership becomes active.',
    icon: 'badge-check',
    implementationStatus: 'implemented',
    subjectType: 'client_membership',
    payloadSchema: triggerPayloadSchema('client_membership'),
  }),
  trig({
    key: 'membership.canceled',
    category: 'finance',
    label: 'Membership canceled',
    description: 'Fires when a client membership is canceled.',
    icon: 'badge-x',
    implementationStatus: 'implemented',
    subjectType: 'client_membership',
    payloadSchema: triggerPayloadSchema('client_membership'),
  }),
  trig({
    key: 'membership.payment_failed',
    category: 'finance',
    label: 'Membership payment failed',
    description: 'Fires when a membership payment fails.',
    icon: 'credit-card',
    implementationStatus: 'implemented',
    subjectType: 'client_membership',
    payloadSchema: triggerPayloadSchema('client_membership'),
  }),
  trig({
    key: 'membership.services_expiring_soon',
    category: 'finance',
    label: 'Membership services expiring',
    description: 'Fires when unused membership service slots are expiring.',
    icon: 'clock',
    implementationStatus: 'implemented',
    subjectType: 'client_membership',
    payloadSchema: triggerPayloadSchema('client_membership'),
  }),
  trig({
    key: 'membership.renewed',
    category: 'finance',
    label: 'Membership renewed',
    description: 'Fires when a membership billing cycle renews.',
    icon: 'refresh-cw',
    implementationStatus: 'implemented',
    subjectType: 'client_membership',
    payloadSchema: triggerPayloadSchema('client_membership'),
  }),
];

export const TRIGGER_BY_KEY = Object.fromEntries(
  TRIGGER_REGISTRY.map((t) => [t.key, t]),
) as Record<string, TriggerDefinition>;

/** Categories that may appear on triggers — used for integrity tests. */
export const TRIGGER_CATEGORY_KEYS = [
  ...new Set(TRIGGER_REGISTRY.map((t) => t.category)),
] as AutomationCategoryKey[];

/** Subject types used across triggers. */
export const TRIGGER_SUBJECT_TYPES = [
  ...new Set(TRIGGER_REGISTRY.map((t) => t.subjectType)),
] as SubjectType[];
