import type { ImplementationStatus } from '../types/automation-registry.types';

/** Sample payloads used by registry integrity tests. */
export const TRIGGER_PAYLOAD_FIXTURES: Record<string, unknown> = {
  'contact.created': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '22222222-2222-4222-8222-222222222222',
    subjectType: 'contact',
  },
  'contact.tag_added': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '22222222-2222-4222-8222-222222222222',
    subjectType: 'contact',
    metadata: {
      tagId: '33333333-3333-4333-8333-333333333333',
      tagName: 'VIP',
    },
  },
  'lead.stage_changed': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '44444444-4444-4444-8444-444444444444',
    subjectType: 'lead',
    contextEntityId: '22222222-2222-4222-8222-222222222222',
    contextEntityType: 'contact',
    metadata: {
      stageId: '55555555-5555-4555-8555-555555555555',
      pipelineId: '66666666-6666-4666-8666-666666666666',
    },
  },
  'appointment.booked': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '77777777-7777-4777-8777-777777777777',
    subjectType: 'appointment',
    contextEntityId: '22222222-2222-4222-8222-222222222222',
    contextEntityType: 'contact',
  },
  'appointment.status_changed': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '77777777-7777-4777-8777-777777777777',
    subjectType: 'appointment',
    metadata: {
      status: 'confirmed',
      previousStatus: 'scheduled',
    },
  },
  'conversation.message_received': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '88888888-8888-4888-8888-888888888888',
    subjectType: 'conversation',
    metadata: {
      channel: 'whatsapp',
      messageId: '99999999-9999-4999-8999-999999999999',
    },
  },
  'invoice.paid': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    subjectType: 'invoice',
    contextEntityId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    contextEntityType: 'payment',
  },
  'payment.received': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    subjectType: 'payment',
  },
  'integration.connected': {
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    subjectType: 'integration',
    metadata: { provider: 'stripe' },
  },
};

export const ACTION_CONFIG_FIXTURES: Record<string, unknown> = {
  'communication.send_email': {
    subject: 'Hello {{contact.first_name}}',
    htmlBody: '<p>Welcome!</p>',
    fromName: '{{business.name}}',
    to: 'contact',
  },
  'communication.send_internal_email': {
    subject: 'Internal alert',
    htmlBody: '<p>New enrollment</p>',
    fromName: '{{business.name}}',
  },
  'communication.send_sms': {
    body: 'Hi {{contact.first_name}}, your appointment is confirmed.',
  },
  'contact.add_tag': {
    tagId: '33333333-3333-4333-8333-333333333333',
  },
  'lead.create': {
    stageId: '55555555-5555-4555-8555-555555555555',
    pipelineId: '66666666-6666-4666-8666-666666666666',
  },
  'lead.move_stage': {
    stageId: '55555555-5555-4555-8555-555555555555',
  },
  'task.create': {
    title: 'Follow up with {{contact.first_name}}',
    description: 'Automation task',
  },
  'note.create': {
    body: 'Note for {{contact.first_name}}',
  },
  'workflow.delay': {
    durationMs: 86400000,
    unit: 'days',
    amount: 1,
  },
  'workflow.condition': {
    conditionKey: 'contact.has_email',
    operator: 'eq',
    value: true,
    trueBranchStepId: '70707070-7070-4070-8070-707070707070',
    falseBranchStepId: '80808080-8080-4080-8080-808080808080',
  },
  'workflow.end': {},
};

export const METADATA_STATUS_FILTER_VALUES: ImplementationStatus[] = [
  'implemented',
  'planned',
  'stub',
];
