import type { AutomationCategoryDefinition } from '../types/automation-registry.types';

function cat(
  key: AutomationCategoryDefinition['key'],
  label: string,
  description: string,
  sortOrder: number,
  scopes: AutomationCategoryDefinition['scopes'],
  icon?: string,
): AutomationCategoryDefinition {
  return { key, label, description, sortOrder, scopes, icon };
}

export const AUTOMATION_CATEGORY_REGISTRY: AutomationCategoryDefinition[] = [
  cat(
    'contact',
    'Contact',
    'Contact record events and actions.',
    10,
    ['trigger', 'action', 'custom_value', 'condition'],
    'user',
  ),
  cat(
    'lead',
    'Lead',
    'Pipeline opportunities and stage changes.',
    20,
    ['trigger', 'action', 'custom_value', 'condition'],
    'target',
  ),
  cat(
    'appointment',
    'Appointment',
    'Bookings, reminders, and calendar-linked visits.',
    30,
    ['trigger', 'action', 'custom_value', 'condition'],
    'calendar-check',
  ),
  cat(
    'calendar',
    'Calendar',
    'Staff calendars and availability.',
    40,
    ['trigger', 'custom_value'],
    'calendar',
  ),
  cat(
    'conversation',
    'Conversation',
    'Inbox threads and inbound messages.',
    50,
    ['trigger', 'action', 'custom_value'],
    'message-square',
  ),
  cat(
    'form',
    'Form',
    'Lead capture form submissions.',
    60,
    ['trigger', 'custom_value', 'condition'],
    'clipboard-list',
  ),
  cat(
    'estimate',
    'Estimate',
    'Quotes and estimates sent to customers.',
    70,
    ['trigger', 'custom_value'],
    'file-text',
  ),
  cat(
    'invoice',
    'Invoice',
    'Invoices, payment links, and balances.',
    80,
    ['trigger', 'custom_value'],
    'receipt',
  ),
  cat(
    'payment',
    'Payment',
    'Recorded payments and refunds.',
    90,
    ['trigger', 'custom_value'],
    'credit-card',
  ),
  cat(
    'task',
    'Task',
    'Internal tasks and to-dos.',
    100,
    ['trigger', 'action', 'custom_value'],
    'check-square',
  ),
  cat(
    'work_item',
    'Work item',
    'Jobs and operational work items.',
    110,
    ['trigger', 'custom_value'],
    'briefcase',
  ),
  cat(
    'note',
    'Note',
    'CRM notes on contacts and records.',
    120,
    ['trigger', 'action', 'custom_value'],
    'sticky-note',
  ),
  cat(
    'service',
    'Service',
    'Bookable services catalog.',
    130,
    ['custom_value'],
    'scissors',
  ),
  cat(
    'integration',
    'Integration',
    'Connected apps and providers.',
    140,
    ['trigger', 'action'],
    'plug',
  ),
  cat(
    'schedule',
    'Schedule',
    'Time-based and recurring triggers.',
    150,
    ['trigger'],
    'clock',
  ),
  cat(
    'workflow',
    'Workflow',
    'Internal flow control: delay, branch, end.',
    160,
    ['action', 'custom_value'],
    'git-branch',
  ),
  cat(
    'communication',
    'Communication',
    'Outbound email, SMS, and messages.',
    170,
    ['action'],
    'send',
  ),
  cat(
    'business',
    'Business',
    'Tenant profile merge fields.',
    180,
    ['custom_value'],
    'building',
  ),
  cat(
    'user',
    'User',
    'Team member and assignee fields.',
    190,
    ['custom_value'],
    'users',
  ),
  cat(
    'ai_agent',
    'AI agent',
    'Chatbot and AI conversation features.',
    200,
    [],
    'bot',
  ),
  cat(
    'finance',
    'Finance',
    'Cross-cutting finance conditions.',
    210,
    ['condition'],
    'dollar-sign',
  ),
  cat(
    'contact_history',
    'Contact history',
    'Client history filters (appointments, visits).',
    220,
    ['condition'],
    'history',
  ),
];

export const AUTOMATION_CATEGORY_BY_KEY = Object.fromEntries(
  AUTOMATION_CATEGORY_REGISTRY.map((c) => [c.key, c]),
) as Record<AutomationCategoryDefinition['key'], AutomationCategoryDefinition>;

export function listCategories(
  scope?: AutomationCategoryDefinition['scopes'][number],
) {
  if (!scope) return [...AUTOMATION_CATEGORY_REGISTRY];
  return AUTOMATION_CATEGORY_REGISTRY.filter((c) => c.scopes.includes(scope));
}
