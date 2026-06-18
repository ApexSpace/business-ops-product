import { z } from 'zod';
import type { ActionDefinition } from '../types/automation-registry.types';
import {
  assignActionConfigSchema,
  conditionActionConfigSchema,
  createNoteActionConfigSchema,
  createTaskActionConfigSchema,
  delayActionConfigSchema,
  emptyActionConfigSchema,
  leadStageActionConfigSchema,
  sendEmailActionConfigSchema,
  tagActionConfigSchema,
  updateFieldActionConfigSchema,
  webhookOutboundActionConfigSchema,
} from '../utils/automation-schema.util';

function act(
  input: ActionDefinition,
): ActionDefinition {
  return input;
}

export const ACTION_REGISTRY: ActionDefinition[] = [
  // Communication (4)
  act({
    key: 'communication.send_email',
    category: 'communication',
    label: 'Send email',
    description: 'Send a templated email to the contact.',
    icon: 'mail',
    implementationStatus: 'implemented',
    configSchema: sendEmailActionConfigSchema,
    requiredContext: ['contact.email'],
  }),
  act({
    key: 'communication.send_internal_email',
    category: 'communication',
    label: 'Send internal email',
    description: 'Notify business owners or admins by email.',
    icon: 'mail',
    implementationStatus: 'implemented',
    configSchema: sendEmailActionConfigSchema,
  }),
  act({
    key: 'communication.send_sms',
    category: 'communication',
    label: 'Send SMS',
    description: 'Send an SMS message to the contact.',
    icon: 'smartphone',
    implementationStatus: 'stub',
    configSchema: sendEmailActionConfigSchema,
    requiredContext: ['contact.phone'],
  }),
  act({
    key: 'communication.send_message',
    category: 'communication',
    label: 'Send message',
    description: 'Send an outbound inbox message on the active channel.',
    icon: 'message-circle',
    implementationStatus: 'planned',
    configSchema: sendEmailActionConfigSchema.extend({
      channel: z.enum(['email', 'whatsapp', 'sms']).optional(),
      body: z.string().min(1),
    }),
    requiredContext: ['conversation.id'],
  }),

  // Contact (3)
  act({
    key: 'contact.add_tag',
    category: 'contact',
    label: 'Add tag',
    description: 'Add a tag to the enrolled contact.',
    icon: 'tag',
    implementationStatus: 'implemented',
    configSchema: tagActionConfigSchema,
    requiredContext: ['contact.id'],
  }),
  act({
    key: 'contact.remove_tag',
    category: 'contact',
    label: 'Remove tag',
    description: 'Remove a tag from the enrolled contact.',
    icon: 'tag',
    implementationStatus: 'planned',
    configSchema: tagActionConfigSchema,
    requiredContext: ['contact.id'],
  }),
  act({
    key: 'contact.update_field',
    category: 'contact',
    label: 'Update field',
    description: 'Update a contact profile field.',
    icon: 'edit',
    implementationStatus: 'planned',
    configSchema: updateFieldActionConfigSchema,
    requiredContext: ['contact.id'],
  }),

  // Lead (3)
  act({
    key: 'lead.create',
    category: 'lead',
    label: 'Create lead',
    description: 'Create a new lead for the contact.',
    icon: 'target',
    implementationStatus: 'implemented',
    configSchema: leadStageActionConfigSchema,
    requiredContext: ['contact.id'],
  }),
  act({
    key: 'lead.move_stage',
    category: 'lead',
    label: 'Move stage',
    description: 'Move the lead to a different pipeline stage.',
    icon: 'git-branch',
    implementationStatus: 'implemented',
    configSchema: leadStageActionConfigSchema,
    requiredContext: ['lead.id'],
  }),
  act({
    key: 'lead.assign',
    category: 'lead',
    label: 'Assign lead',
    description: 'Assign the lead to a team member.',
    icon: 'user-check',
    implementationStatus: 'planned',
    configSchema: assignActionConfigSchema,
    requiredContext: ['lead.id'],
  }),

  // Appointment (1)
  act({
    key: 'appointment.update_status',
    category: 'appointment',
    label: 'Update status',
    description: 'Change appointment status.',
    icon: 'calendar',
    implementationStatus: 'stub',
    configSchema: updateFieldActionConfigSchema,
    requiredContext: ['appointment.id'],
  }),

  // Task (2)
  act({
    key: 'task.create',
    category: 'task',
    label: 'Create task',
    description: 'Create an internal follow-up task.',
    icon: 'plus-square',
    implementationStatus: 'implemented',
    configSchema: createTaskActionConfigSchema,
  }),
  act({
    key: 'task.complete',
    category: 'task',
    label: 'Complete task',
    description: 'Mark an existing task as complete.',
    icon: 'check-square',
    implementationStatus: 'planned',
    configSchema: assignActionConfigSchema.extend({
      taskId: z.string().uuid(),
    }),
    requiredContext: ['task.id'],
  }),

  // Note (1)
  act({
    key: 'note.create',
    category: 'note',
    label: 'Create note',
    description: 'Add a note on the contact record.',
    icon: 'sticky-note',
    implementationStatus: 'implemented',
    configSchema: createNoteActionConfigSchema,
    requiredContext: ['contact.id'],
  }),

  // Conversation (2)
  act({
    key: 'conversation.assign',
    category: 'conversation',
    label: 'Assign conversation',
    description: 'Assign the conversation to a team member.',
    icon: 'user-check',
    implementationStatus: 'planned',
    configSchema: assignActionConfigSchema,
    requiredContext: ['conversation.id'],
  }),
  act({
    key: 'conversation.close',
    category: 'conversation',
    label: 'Close conversation',
    description: 'Close the active conversation thread.',
    icon: 'archive',
    implementationStatus: 'planned',
    configSchema: emptyActionConfigSchema,
    requiredContext: ['conversation.id'],
  }),

  // Workflow (4)
  act({
    key: 'workflow.delay',
    category: 'workflow',
    label: 'Wait',
    description: 'Pause the workflow for a specified duration.',
    icon: 'clock',
    implementationStatus: 'implemented',
    configSchema: delayActionConfigSchema,
  }),
  act({
    key: 'workflow.wait_until',
    category: 'workflow',
    label: 'Wait until',
    description: 'Pause until a specific date and time.',
    icon: 'calendar-clock',
    implementationStatus: 'stub',
    configSchema: z.object({
      until: z.string().datetime(),
    }),
  }),
  act({
    key: 'workflow.condition',
    category: 'workflow',
    label: 'If / else',
    description: 'Branch the workflow based on a condition.',
    icon: 'git-branch',
    implementationStatus: 'implemented',
    configSchema: conditionActionConfigSchema,
  }),
  act({
    key: 'workflow.end',
    category: 'workflow',
    label: 'End',
    description: 'End the workflow run.',
    icon: 'square',
    implementationStatus: 'implemented',
    configSchema: emptyActionConfigSchema,
    isTerminal: true,
  }),

  // Integration (1)
  act({
    key: 'integration.webhook_outbound',
    category: 'integration',
    label: 'Webhook',
    description: 'Send an outbound HTTP webhook with workflow context.',
    icon: 'webhook',
    implementationStatus: 'stub',
    configSchema: webhookOutboundActionConfigSchema,
  }),
];

export const ACTION_BY_KEY = Object.fromEntries(
  ACTION_REGISTRY.map((a) => [a.key, a]),
) as Record<string, ActionDefinition>;
