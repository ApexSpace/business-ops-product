import {
  CalendarType,
  ChatbotRuleTriggerType,
  PipelineStageType,
} from '@prisma/client';
import {
  DEFAULT_TERMINOLOGY,
  SnapshotAssets,
} from '../types/snapshot-assets.types';

function baseNavigation(): SnapshotAssets['navigation'] {
  return [
    {
      key: 'dashboard',
      route: '/business/dashboard',
      icon: 'layout-dashboard',
      labelKey: 'nav.dashboard',
      order: 1,
    },
    {
      key: 'contacts',
      route: '/business/contacts',
      icon: 'contact',
      labelKey: 'nav.contacts',
      order: 2,
    },
    {
      key: 'conversations',
      route: '/business/conversations',
      icon: 'message-square',
      labelKey: 'nav.conversations',
      order: 3,
    },
    {
      key: 'pipelines',
      route: '/business/pipelines',
      icon: 'git-branch',
      labelKey: 'nav.pipelines',
      order: 4,
    },
    {
      key: 'leads',
      route: '/business/leads',
      icon: 'target',
      labelKey: 'nav.leads',
      order: 5,
    },
    {
      key: 'work-items',
      route: '/business/work-items',
      icon: 'clipboard-list',
      labelKey: 'nav.workItems',
      order: 6,
    },
    {
      key: 'appointments',
      route: '/business/appointments',
      icon: 'calendar',
      labelKey: 'nav.appointments',
      order: 7,
    },
    {
      key: 'payments',
      route: '/business/payments',
      icon: 'credit-card',
      labelKey: 'nav.payments',
      order: 8,
    },
  ];
}

function baseDashboard(): SnapshotAssets['dashboard'] {
  return {
    widgets: [
      { key: 'leads', order: 1 },
      { key: 'contacts', order: 2 },
      { key: 'appointments', order: 3 },
      { key: 'conversations', order: 4 },
      { key: 'workItems', order: 5 },
      { key: 'wonDeals', order: 6 },
      { key: 'teamMembers', order: 7 },
    ],
    quickLinks: [
      { href: '/business/contacts', labelKey: 'nav.contacts', order: 1 },
      { href: '/business/work-items', labelKey: 'nav.workItems', order: 2 },
      { href: '/business/pipelines', labelKey: 'nav.pipelines', order: 3 },
      {
        href: '/business/appointments',
        labelKey: 'nav.appointments',
        order: 4,
      },
      {
        href: '/business/conversations',
        labelKey: 'nav.conversations',
        order: 5,
      },
      { href: '/business/settings/team', label: 'Team', order: 6 },
    ],
  };
}

function baseEmailPrefs() {
  return [
    { emailType: 'membership.invite', enabled: true },
    { emailType: 'appointment.confirmation', enabled: true },
    { emailType: 'appointment.reminder', enabled: true },
    { emailType: 'invoice.sent', enabled: true },
  ];
}

function baseEmailTemplates() {
  return [
    {
      emailType: 'appointment.confirmation',
      subject: 'Your appointment with {{business.name}} is confirmed',
      htmlBody:
        '<p>Hi {{contact.name}},</p><p>Your appointment is confirmed for {{appointment.start_at}}.</p>',
      textBody:
        'Hi {{contact.name}}, your appointment is confirmed for {{appointment.start_at}}.',
    },
    {
      emailType: 'membership.invite',
      subject: 'You have been invited to join {{business.name}}',
      htmlBody:
        '<p>Hi,</p><p>{{inviter.name}} invited you to join {{business.name}}.</p><p><a href="{{invite_link}}">Accept invitation</a></p>',
      textBody:
        'Hi, {{inviter.name}} invited you to join {{business.name}}. Accept: {{invite_link}}',
    },
    {
      emailType: 'invoice.sent',
      subject: 'Invoice {{invoice.number}} from {{business.name}}',
      htmlBody:
        '<p>Hi {{contact.name}},</p><p>Invoice {{invoice.number}} total {{invoice.total}}.</p>',
      textBody:
        'Hi {{contact.name}}, invoice {{invoice.number}} total {{invoice.total}}.',
    },
  ];
}

function baseChatbot(name: string, sourceKey: string, welcome: string) {
  return {
    sourceKey,
    name,
    widgetTitle: name,
    welcomeMessage: welcome,
    primaryColor: '#2563eb',
    rules: [
      {
        sourceKey: 'hours',
        triggerType: ChatbotRuleTriggerType.CONTAINS,
        triggerText: 'hours',
        responseText: 'We are open Monday–Friday, 9 AM to 5 PM.',
        sortOrder: 0,
      },
      {
        sourceKey: 'fallback',
        triggerType: ChatbotRuleTriggerType.FALLBACK,
        triggerText: '',
        responseText:
          'Thanks for reaching out! A team member will reply shortly.',
        sortOrder: 99,
      },
    ],
  };
}

export const DEFAULT_SNAPSHOT_ID = 'a0000000-0000-4000-8000-000000000001';
export const DENTAL_SNAPSHOT_ID = 'a0000000-0000-4000-8000-000000000002';
export const LEGAL_SNAPSHOT_ID = 'a0000000-0000-4000-8000-000000000003';
export const HOME_SERVICES_SNAPSHOT_ID = 'a0000000-0000-4000-8000-000000000004';

export interface SnapshotSeedDefinition {
  id: string;
  name: string;
  description: string;
  assets: SnapshotAssets;
}

export function buildDefaultBusinessSnapshot(): SnapshotSeedDefinition {
  return {
    id: DEFAULT_SNAPSHOT_ID,
    name: 'Default Business Snapshot',
    description: 'General-purpose blueprint for any small business',
    assets: {
      terminology: { ...DEFAULT_TERMINOLOGY },
      navigation: baseNavigation(),
      dashboard: baseDashboard(),
      crm: {
        pipelines: [
          {
            sourceKey: 'default-pipeline',
            name: 'Sales Pipeline',
            isDefault: true,
            stages: [
              { name: 'New Lead', type: PipelineStageType.OPEN },
              { name: 'Contacted', type: PipelineStageType.OPEN },
              { name: 'Qualified', type: PipelineStageType.OPEN },
              { name: 'Won', type: PipelineStageType.WON },
              { name: 'Lost', type: PipelineStageType.LOST },
            ],
          },
        ],
        services: [
          {
            sourceKey: 'consultation',
            name: 'Consultation',
            category: 'General',
            description: 'Initial consultation session',
            price: 0,
          },
          {
            sourceKey: 'standard-service',
            name: 'Standard Service',
            category: 'General',
            description: 'Core service offering',
            price: 150,
          },
          {
            sourceKey: 'premium-service',
            name: 'Premium Service',
            category: 'General',
            description: 'Premium tier service',
            price: 350,
          },
        ],
        tags: [
          { sourceKey: 'vip', name: 'VIP', color: '#f59e0b' },
          { sourceKey: 'new-lead', name: 'New Lead', color: '#3b82f6' },
          { sourceKey: 'follow-up', name: 'Follow Up', color: '#8b5cf6' },
        ],
      },
      calendars: [
        {
          sourceKey: 'main-calendar',
          name: 'Main Calendar',
          type: CalendarType.SERVICE,
          timezone: 'America/New_York',
          defaultDurationMinutes: 30,
        },
      ],
      chatbots: [
        baseChatbot(
          'Website Assistant',
          'website-assistant',
          'Hi there! How can we help you today?',
        ),
      ],
      emails: {
        preferences: baseEmailPrefs(),
        templates: baseEmailTemplates(),
      },
      branding: {
        productName: 'Business Hub',
        accentColor: '#2563eb',
      },
      integrations: {
        recommended: ['google-calendar', 'stripe', 'google-business-profile'],
      },
    },
  };
}

export function buildDentalPracticeSnapshot(): SnapshotSeedDefinition {
  const terminology = {
    ...DEFAULT_TERMINOLOGY,
    'nav.contacts': 'Patients',
    'nav.appointments': 'Visits',
    'nav.pipelines': 'Treatment Pipeline',
    'nav.leads': 'Consultations',
    'nav.workItems': 'Treatment Plans',
    'entities.contact.plural': 'Patients',
    'entities.contact.singular': 'Patient',
    'entities.lead.plural': 'Consultations',
    'entities.appointment.plural': 'Visits',
    'actions.bookAppointment': 'Schedule visit',
    'dashboard.contacts': 'Patients',
    'dashboard.appointments': 'Upcoming visits',
  };

  return {
    id: DENTAL_SNAPSHOT_ID,
    name: 'Dental Practice Snapshot',
    description: 'Blueprint for dental and oral health practices',
    assets: {
      terminology,
      navigation: baseNavigation(),
      dashboard: baseDashboard(),
      crm: {
        pipelines: [
          {
            sourceKey: 'treatment-pipeline',
            name: 'Treatment Pipeline',
            isDefault: true,
            stages: [
              { name: 'New Inquiry', type: PipelineStageType.OPEN },
              { name: 'Consultation Booked', type: PipelineStageType.OPEN },
              { name: 'Treatment Planned', type: PipelineStageType.OPEN },
              { name: 'In Treatment', type: PipelineStageType.OPEN },
              { name: 'Completed', type: PipelineStageType.WON },
              { name: 'Lost', type: PipelineStageType.LOST },
            ],
          },
        ],
        services: [
          {
            sourceKey: 'cleaning',
            name: 'Dental Cleaning',
            category: 'Preventive',
            price: 120,
          },
          {
            sourceKey: 'whitening',
            name: 'Teeth Whitening',
            category: 'Cosmetic',
            price: 450,
          },
          {
            sourceKey: 'consultation',
            name: 'New Patient Consultation',
            category: 'Consultation',
            price: 0,
          },
          {
            sourceKey: 'filling',
            name: 'Composite Filling',
            category: 'Restorative',
            price: 275,
          },
        ],
        tags: [
          { sourceKey: 'new-patient', name: 'New Patient', color: '#06b6d4' },
          { sourceKey: 'insurance', name: 'Insurance', color: '#10b981' },
          { sourceKey: 'recall-due', name: 'Recall Due', color: '#ef4444' },
        ],
      },
      calendars: [
        {
          sourceKey: 'chair-calendar',
          name: 'Treatment Chair',
          type: CalendarType.SERVICE,
          timezone: 'America/New_York',
          defaultDurationMinutes: 45,
        },
      ],
      chatbots: [
        baseChatbot(
          'Dental Office Bot',
          'dental-bot',
          'Welcome! Ask about appointments, insurance, or office hours.',
        ),
      ],
      emails: {
        preferences: baseEmailPrefs(),
        templates: baseEmailTemplates(),
      },
      branding: {
        productName: 'Dental Practice Hub',
        accentColor: '#0891b2',
      },
      integrations: {
        recommended: ['google-calendar', 'stripe', 'google-business-profile'],
      },
    },
  };
}

export function buildLegalPracticeSnapshot(): SnapshotSeedDefinition {
  const terminology = {
    ...DEFAULT_TERMINOLOGY,
    'nav.contacts': 'Clients',
    'nav.pipelines': 'Case Pipeline',
    'nav.leads': 'Inquiries',
    'nav.workItems': 'Matters',
    'nav.appointments': 'Consultations',
    'entities.contact.plural': 'Clients',
    'entities.contact.singular': 'Client',
    'entities.lead.plural': 'Inquiries',
    'entities.workItem.plural': 'Matters',
    'actions.bookAppointment': 'Schedule consultation',
    'dashboard.contacts': 'Clients',
    'dashboard.workItems': 'Active matters',
  };

  return {
    id: LEGAL_SNAPSHOT_ID,
    name: 'Legal Practice Snapshot',
    description: 'Blueprint for law firms and legal services',
    assets: {
      terminology,
      navigation: baseNavigation(),
      dashboard: baseDashboard(),
      crm: {
        pipelines: [
          {
            sourceKey: 'case-pipeline',
            name: 'Case Pipeline',
            isDefault: true,
            stages: [
              { name: 'New Inquiry', type: PipelineStageType.OPEN },
              { name: 'Consultation', type: PipelineStageType.OPEN },
              { name: 'Retained', type: PipelineStageType.OPEN },
              { name: 'Case Closed', type: PipelineStageType.WON },
              { name: 'Lost', type: PipelineStageType.LOST },
            ],
          },
        ],
        services: [
          {
            sourceKey: 'initial-consultation',
            name: 'Initial Consultation',
            category: 'Consultation',
            price: 250,
          },
          {
            sourceKey: 'document-review',
            name: 'Document Review',
            category: 'Legal Services',
            price: 500,
          },
          {
            sourceKey: 'retainer',
            name: 'Retainer Agreement',
            category: 'Billing',
            price: 2500,
          },
        ],
        tags: [
          { sourceKey: 'retainer', name: 'Retainer', color: '#6366f1' },
          { sourceKey: 'litigation', name: 'Litigation', color: '#dc2626' },
          { sourceKey: 'corporate', name: 'Corporate', color: '#059669' },
        ],
      },
      calendars: [
        {
          sourceKey: 'consultation-calendar',
          name: 'Consultation Calendar',
          type: CalendarType.STAFF,
          timezone: 'America/New_York',
          defaultDurationMinutes: 60,
        },
      ],
      chatbots: [
        baseChatbot(
          'Legal Intake Bot',
          'legal-intake-bot',
          'Hello. How may we assist with your legal inquiry today?',
        ),
      ],
      emails: {
        preferences: baseEmailPrefs(),
        templates: baseEmailTemplates(),
      },
      branding: {
        productName: 'Legal Practice Hub',
        accentColor: '#1e40af',
      },
      integrations: {
        recommended: ['google-calendar', 'stripe', 'quickbooks'],
      },
    },
  };
}

export function buildHomeServicesSnapshot(): SnapshotSeedDefinition {
  const terminology = {
    ...DEFAULT_TERMINOLOGY,
    'nav.contacts': 'Customers',
    'nav.leads': 'Estimates',
    'nav.workItems': 'Jobs',
    'nav.appointments': 'Service Calls',
    'nav.pipelines': 'Job Pipeline',
    'entities.contact.plural': 'Customers',
    'entities.contact.singular': 'Customer',
    'entities.lead.plural': 'Estimates',
    'entities.workItem.plural': 'Jobs',
    'entities.appointment.plural': 'Service calls',
    'actions.bookAppointment': 'Schedule service',
    'dashboard.workItems': 'Open jobs',
    'dashboard.appointments': 'Scheduled service calls',
  };

  return {
    id: HOME_SERVICES_SNAPSHOT_ID,
    name: 'Home Services Snapshot',
    description: 'Blueprint for HVAC, plumbing, and home service contractors',
    assets: {
      terminology,
      navigation: baseNavigation(),
      dashboard: baseDashboard(),
      crm: {
        pipelines: [
          {
            sourceKey: 'job-pipeline',
            name: 'Service Job Pipeline',
            isDefault: true,
            stages: [
              { name: 'New Request', type: PipelineStageType.OPEN },
              { name: 'Estimate Sent', type: PipelineStageType.OPEN },
              { name: 'Job Scheduled', type: PipelineStageType.OPEN },
              { name: 'Job Completed', type: PipelineStageType.WON },
              { name: 'Lost', type: PipelineStageType.LOST },
            ],
          },
        ],
        services: [
          {
            sourceKey: 'diagnostic',
            name: 'Diagnostic Visit',
            category: 'Service',
            price: 89,
          },
          {
            sourceKey: 'maintenance',
            name: 'Maintenance Plan',
            category: 'Subscription',
            price: 199,
          },
          {
            sourceKey: 'emergency',
            name: 'Emergency Repair',
            category: 'Emergency',
            price: 350,
          },
          {
            sourceKey: 'installation',
            name: 'Equipment Installation',
            category: 'Installation',
            price: 1200,
          },
        ],
        tags: [
          { sourceKey: 'warranty', name: 'Warranty', color: '#22c55e' },
          { sourceKey: 'commercial', name: 'Commercial', color: '#64748b' },
          { sourceKey: 'priority', name: 'Priority', color: '#f97316' },
        ],
      },
      calendars: [
        {
          sourceKey: 'technician-calendar',
          name: 'Technician Schedule',
          type: CalendarType.ROUND_ROBIN,
          timezone: 'America/Chicago',
          defaultDurationMinutes: 60,
        },
      ],
      chatbots: [
        baseChatbot(
          'Service Bot',
          'service-bot',
          'Need a quote or to schedule service? We are here to help!',
        ),
      ],
      emails: {
        preferences: baseEmailPrefs(),
        templates: baseEmailTemplates(),
      },
      branding: {
        productName: 'Home Services Hub',
        accentColor: '#ea580c',
      },
      integrations: {
        recommended: ['google-calendar', 'stripe', 'google-business-profile'],
      },
    },
  };
}

export const SNAPSHOT_SEED_DEFINITIONS: SnapshotSeedDefinition[] = [
  buildDefaultBusinessSnapshot(),
  buildDentalPracticeSnapshot(),
  buildLegalPracticeSnapshot(),
  buildHomeServicesSnapshot(),
];

export function snapshotAssetsJson(assets: SnapshotAssets): string {
  return JSON.stringify(assets);
}
