import { CalendarType, ChatbotRuleTriggerType, PipelineStageType } from '@prisma/client';

export interface SnapshotNavItem {
  key: string;
  route: string;
  icon: string;
  labelKey: string;
  order: number;
  visible?: boolean;
  requiredRoles?: string[];
}

export interface SnapshotDashboardWidget {
  key: string;
  order: number;
  visible?: boolean;
}

export interface SnapshotQuickLink {
  href: string;
  labelKey?: string;
  label?: string;
  order: number;
  visible?: boolean;
}

export interface SnapshotPipelineStageAsset {
  name: string;
  type: PipelineStageType;
}

export interface SnapshotPipelineAsset {
  sourceKey: string;
  name: string;
  isDefault?: boolean;
  stages: SnapshotPipelineStageAsset[];
}

export interface SnapshotServiceAsset {
  sourceKey: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
}

export interface SnapshotTagAsset {
  sourceKey: string;
  name: string;
  color?: string;
}

export interface SnapshotAvailabilitySlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface SnapshotCalendarAsset {
  sourceKey: string;
  name: string;
  type?: CalendarType;
  timezone?: string;
  defaultDurationMinutes?: number;
  availabilityTemplate?: SnapshotAvailabilitySlot[];
}

export interface SnapshotChatbotRuleAsset {
  sourceKey: string;
  triggerType: ChatbotRuleTriggerType;
  triggerText: string;
  responseText: string;
  sortOrder?: number;
}

export interface SnapshotChatbotAsset {
  sourceKey: string;
  name: string;
  widgetTitle?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  rules?: SnapshotChatbotRuleAsset[];
}

export interface SnapshotEmailPreferenceAsset {
  emailType: string;
  enabled: boolean;
}

export interface SnapshotEmailTemplateAsset {
  emailType: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SnapshotBranding {
  productName?: string;
  accentColor?: string;
  logoUrl?: string;
  publicPageTitle?: string;
}

export interface SnapshotIntegrations {
  recommended?: string[];
}

export interface SnapshotAssets {
  terminology: Record<string, string>;
  navigation: SnapshotNavItem[];
  dashboard: {
    widgets: SnapshotDashboardWidget[];
    quickLinks: SnapshotQuickLink[];
  };
  crm?: {
    pipelines?: SnapshotPipelineAsset[];
    services?: SnapshotServiceAsset[];
    tags?: SnapshotTagAsset[];
  };
  calendars?: SnapshotCalendarAsset[];
  chatbots?: SnapshotChatbotAsset[];
  emails?: {
    preferences?: SnapshotEmailPreferenceAsset[];
    templates?: SnapshotEmailTemplateAsset[];
  };
  branding?: SnapshotBranding;
  integrations?: SnapshotIntegrations;
}

export const DEFAULT_TERMINOLOGY: Record<string, string> = {
  'nav.dashboard': 'Dashboard',
  'nav.contacts': 'Contacts',
  'nav.leads': 'Leads',
  'nav.conversations': 'Conversations',
  'nav.pipelines': 'CRM Pipeline',
  'nav.workItems': 'Work Items',
  'nav.appointments': 'Appointments',
  'nav.invoices': 'Invoices',
  'nav.estimates': 'Estimates',
  'nav.payments': 'Payments',
  'entities.contact.plural': 'Contacts',
  'entities.contact.singular': 'Contact',
  'entities.contact.allItems': 'All Contacts',
  'entities.contact.addNew': 'Add New',
  'entities.contact.addNewItem': 'Add New Contact',
  'entities.contact.editItem': 'Edit Contact',
  'entities.contact.newItem': 'New Contact',
  'entities.contact.viewItem': 'View Contact',
  'entities.contact.viewItems': 'View Contacts',
  'entities.contact.searchItems': 'Search Contacts',
  'entities.contact.notFound': 'No contacts found.',
  'entities.contact.notFoundInTrash': 'No contacts found in Trash.',
  'entities.contact.itemPublished': 'Contact published.',
  'entities.contact.itemUpdated': 'Contact updated.',
  'entities.lead.plural': 'Leads',
  'entities.lead.singular': 'Lead',
  'entities.lead.allItems': 'All Leads',
  'entities.lead.addNew': 'Add New',
  'entities.lead.addNewItem': 'Add New Lead',
  'entities.lead.editItem': 'Edit Lead',
  'entities.lead.newItem': 'New Lead',
  'entities.lead.viewItem': 'View Lead',
  'entities.lead.viewItems': 'View Leads',
  'entities.lead.searchItems': 'Search Leads',
  'entities.lead.notFound': 'No leads found.',
  'entities.lead.notFoundInTrash': 'No leads found in Trash.',
  'entities.lead.itemPublished': 'Lead published.',
  'entities.lead.itemUpdated': 'Lead updated.',
  'entities.pipeline.plural': 'Pipelines',
  'entities.pipeline.singular': 'Pipeline',
  'entities.pipeline.allItems': 'All Pipelines',
  'entities.pipeline.addNew': 'Add New',
  'entities.pipeline.addNewItem': 'Add New Pipeline',
  'entities.pipeline.editItem': 'Edit Pipeline',
  'entities.pipeline.newItem': 'New Pipeline',
  'entities.pipeline.viewItem': 'View Pipeline',
  'entities.pipeline.viewItems': 'View Pipelines',
  'entities.pipeline.searchItems': 'Search Pipelines',
  'entities.pipeline.notFound': 'No pipelines found.',
  'entities.pipeline.notFoundInTrash': 'No pipelines found in Trash.',
  'entities.pipeline.itemPublished': 'Pipeline published.',
  'entities.pipeline.itemUpdated': 'Pipeline updated.',
  'entities.workItem.plural': 'Work Items',
  'entities.workItem.singular': 'Work Item',
  'entities.workItem.allItems': 'All Work Items',
  'entities.workItem.addNew': 'Add New',
  'entities.workItem.addNewItem': 'Add New Work Item',
  'entities.workItem.editItem': 'Edit Work Item',
  'entities.workItem.newItem': 'New Work Item',
  'entities.workItem.viewItem': 'View Work Item',
  'entities.workItem.viewItems': 'View Work Items',
  'entities.workItem.searchItems': 'Search Work Items',
  'entities.workItem.notFound': 'No work items found.',
  'entities.workItem.notFoundInTrash': 'No work items found in Trash.',
  'entities.workItem.itemPublished': 'Work item published.',
  'entities.workItem.itemUpdated': 'Work item updated.',
  'entities.appointment.plural': 'Appointments',
  'entities.appointment.singular': 'Appointment',
  'entities.appointment.allItems': 'All Appointments',
  'entities.appointment.addNew': 'Add New',
  'entities.appointment.addNewItem': 'Add New Appointment',
  'entities.appointment.editItem': 'Edit Appointment',
  'entities.appointment.newItem': 'New Appointment',
  'entities.appointment.viewItem': 'View Appointment',
  'entities.appointment.viewItems': 'View Appointments',
  'entities.appointment.searchItems': 'Search Appointments',
  'entities.appointment.notFound': 'No appointments found.',
  'entities.appointment.notFoundInTrash': 'No appointments found in Trash.',
  'entities.appointment.itemPublished': 'Appointment published.',
  'entities.appointment.itemUpdated': 'Appointment updated.',
  'entities.invoice.plural': 'Invoices',
  'entities.invoice.singular': 'Invoice',
  'entities.invoice.allItems': 'All Invoices',
  'entities.invoice.addNew': 'Add New',
  'entities.invoice.addNewItem': 'Add New Invoice',
  'entities.invoice.editItem': 'Edit Invoice',
  'entities.invoice.newItem': 'New Invoice',
  'entities.invoice.viewItem': 'View Invoice',
  'entities.invoice.viewItems': 'View Invoices',
  'entities.invoice.searchItems': 'Search Invoices',
  'entities.invoice.notFound': 'No invoices found.',
  'entities.invoice.notFoundInTrash': 'No invoices found in Trash.',
  'entities.invoice.itemPublished': 'Invoice published.',
  'entities.invoice.itemUpdated': 'Invoice updated.',
  'entities.estimate.plural': 'Estimates',
  'entities.estimate.singular': 'Estimate',
  'entities.estimate.allItems': 'All Estimates',
  'entities.estimate.addNew': 'Add New',
  'entities.estimate.addNewItem': 'Add New Estimate',
  'entities.estimate.editItem': 'Edit Estimate',
  'entities.estimate.newItem': 'New Estimate',
  'entities.estimate.viewItem': 'View Estimate',
  'entities.estimate.viewItems': 'View Estimates',
  'entities.estimate.searchItems': 'Search Estimates',
  'entities.estimate.notFound': 'No estimates found.',
  'entities.estimate.notFoundInTrash': 'No estimates found in Trash.',
  'entities.estimate.itemPublished': 'Estimate published.',
  'entities.estimate.itemUpdated': 'Estimate updated.',
  'entities.conversation.plural': 'Conversations',
  'entities.conversation.singular': 'Conversation',
  'entities.conversation.allItems': 'All Conversations',
  'entities.conversation.addNew': 'Add New',
  'entities.conversation.addNewItem': 'Add New Conversation',
  'entities.conversation.editItem': 'Edit Conversation',
  'entities.conversation.newItem': 'New Conversation',
  'entities.conversation.viewItem': 'View Conversation',
  'entities.conversation.viewItems': 'View Conversations',
  'entities.conversation.searchItems': 'Search Conversations',
  'entities.conversation.notFound': 'No conversations found.',
  'entities.conversation.notFoundInTrash': 'No conversations found in Trash.',
  'entities.conversation.itemPublished': 'Conversation published.',
  'entities.conversation.itemUpdated': 'Conversation updated.',
  'entities.payment.plural': 'Payments',
  'entities.payment.singular': 'Payment',
  'entities.payment.allItems': 'All Payments',
  'entities.payment.addNew': 'Add New',
  'entities.payment.addNewItem': 'Add New Payment',
  'entities.payment.editItem': 'Edit Payment',
  'entities.payment.newItem': 'New Payment',
  'entities.payment.viewItem': 'View Payment',
  'entities.payment.viewItems': 'View Payments',
  'entities.payment.searchItems': 'Search Payments',
  'entities.payment.notFound': 'No payments found.',
  'entities.payment.notFoundInTrash': 'No payments found in Trash.',
  'entities.payment.itemPublished': 'Payment published.',
  'entities.payment.itemUpdated': 'Payment updated.',
  'actions.bookAppointment': 'Book appointment',
  'dashboard.leads': 'Active leads',
  'dashboard.contacts': 'Contacts',
  'dashboard.appointments': 'Upcoming appointments',
  'dashboard.conversations': 'Open conversations',
  'dashboard.workItems': 'Work items',
  'dashboard.workItemsCompleted': 'Completed work items',
  'dashboard.pipelines': 'Pipeline value',
  'dashboard.wonDeals': 'Won deals',
  'dashboard.teamMembers': 'Team members',
};

export const EMPTY_SNAPSHOT_ASSETS: SnapshotAssets = {
  terminology: { ...DEFAULT_TERMINOLOGY },
  navigation: [],
  dashboard: { widgets: [], quickLinks: [] },
};
