import { randomUUID } from 'node:crypto';
import type {
  WorkflowSettings,
  WorkflowStepDefinition,
  WorkflowTriggerFilter,
} from '../types/workflow.types';
import { DEFAULT_WORKFLOW_SETTINGS } from '../types/workflow.types';

export type MedSpaWorkflowTemplate = {
  name: string;
  description: string;
  triggerKey: string;
  triggerFilters?: WorkflowTriggerFilter[];
  steps: WorkflowStepDefinition[];
  settings?: Partial<WorkflowSettings>;
};

function endStep(): WorkflowStepDefinition {
  return { id: randomUUID(), actionKey: 'workflow.end', config: {} };
}

export const MEDSPA_WORKFLOW_TEMPLATES: MedSpaWorkflowTemplate[] = [
  {
    name: 'Appointment confirmation email',
    description:
      'Send a confirmation email when an appointment is booked (MedSpa preset).',
    triggerKey: 'appointment.booked',
    steps: [
      {
        id: randomUUID(),
        actionKey: 'communication.send_email',
        config: {
          subject: 'Your appointment is confirmed',
          htmlBody:
            '<p>Hi {{contact.first_name}},</p><p>We look forward to seeing you on {{appointment.start_at}}.</p>',
        },
      },
      endStep(),
    ],
  },
  {
    name: 'Post-visit follow-up',
    description:
      'Wait one day after appointment completion, then send a follow-up email.',
    triggerKey: 'appointment.status_changed',
    triggerFilters: [
      { fieldKey: 'status', operator: 'eq', value: 'COMPLETED' },
    ],
    steps: [
      {
        id: randomUUID(),
        actionKey: 'workflow.delay',
        config: { amount: 1, unit: 'days' },
      },
      {
        id: randomUUID(),
        actionKey: 'communication.send_email',
        config: {
          subject: 'How was your visit?',
          htmlBody:
            '<p>Hi {{contact.first_name}},</p><p>Thank you for visiting {{business.name}}. We hope you enjoyed your appointment.</p>',
        },
      },
      endStep(),
    ],
  },
  {
    name: 'Form submission → lead + staff notify',
    description:
      'Create a lead and notify staff when a form is submitted (MedSpa preset). Replace the placeholder stage before activating.',
    triggerKey: 'form.submitted',
    steps: [
      {
        id: randomUUID(),
        actionKey: 'lead.create',
        config: {
          stageId: '00000000-0000-0000-0000-000000000000',
        },
      },
      {
        id: randomUUID(),
        actionKey: 'communication.send_internal_email',
        config: {
          subject: 'New form submission',
          htmlBody:
            '<p>A new form was submitted by {{contact.full_name}} ({{contact.email}}).</p>',
        },
      },
      endStep(),
    ],
  },
];

export function medSpaTemplateToCreateInput(
  template: MedSpaWorkflowTemplate,
): {
  name: string;
  description: string;
  triggerKey: string;
  triggerFilters: WorkflowTriggerFilter[] | null;
  steps: WorkflowStepDefinition[];
  settings: WorkflowSettings;
  isSystemTemplate: true;
  status: 'INACTIVE';
} {
  return {
    name: template.name,
    description: template.description,
    triggerKey: template.triggerKey,
    triggerFilters: template.triggerFilters ?? null,
    steps: template.steps.map((step) => ({ ...step, id: randomUUID() })),
    settings: { ...DEFAULT_WORKFLOW_SETTINGS, ...template.settings },
    isSystemTemplate: true,
    status: 'INACTIVE',
  };
}
