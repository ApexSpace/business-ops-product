import type { EmailTypeCategory } from "@/features/email-notifications/api/email-notifications.api";

export interface EmailTypeDefinition {
  key: string;
  category: EmailTypeCategory;
  label: string;
  description: string;
  defaultSubject: string;
  defaultHtmlBody: string;
  variables: string[];
}

const WRAPPER = (body: string) =>
  `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">${body}</div>`;

export const CONFIGURABLE_EMAIL_TYPE_REGISTRY: Record<
  string,
  EmailTypeDefinition
> = {
  "membership.invite": {
    key: "membership.invite",
    category: "membership",
    label: "Team invite",
    description: "Sent when a team member is invited to join the business.",
    defaultSubject: "You have been invited to join {{business.name}}",
    defaultHtmlBody: WRAPPER(`
      <p>Hi,</p>
      <p>{{inviter.name}} invited you to join <strong>{{business.name}}</strong>.</p>
      <p><a href="{{invite_link}}">Accept invitation</a></p>
      <p>If you did not expect this email, you can ignore it.</p>
    `),
    variables: [
      "invitee.email",
      "inviter.name",
      "business.name",
      "invite_link",
    ],
  },
  "appointment.confirmation": {
    key: "appointment.confirmation",
    category: "appointments",
    label: "Booking confirmation",
    description: "Sent to the customer when an appointment is created.",
    defaultSubject: "Your appointment with {{business.name}} is confirmed",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> is confirmed.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
      <p>We look forward to seeing you.</p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "appointment.start_at",
      "appointment.end_at",
      "appointment.calendar_name",
      "appointment.title",
    ],
  },
  "appointment.owner_notification": {
    key: "appointment.owner_notification",
    category: "appointments",
    label: "New booking notification",
    description: "Sent to business owners when a new appointment is created.",
    defaultSubject: "New booking: {{contact.name}} on {{appointment.start_at}}",
    defaultHtmlBody: WRAPPER(`
      <p>A new booking was received for <strong>{{business.name}}</strong>.</p>
      <p><strong>Customer:</strong> {{contact.name}}</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "contact.email",
      "appointment.start_at",
      "appointment.calendar_name",
      "appointment.title",
    ],
  },
  "appointment.reminder": {
    key: "appointment.reminder",
    category: "appointments",
    label: "Appointment reminder",
    description: "Sent to the customer before their appointment starts.",
    defaultSubject: "Reminder: your appointment with {{business.name}}",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>This is a reminder about your upcoming appointment with <strong>{{business.name}}</strong>.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
      <p>We look forward to seeing you.</p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "appointment.start_at",
      "appointment.end_at",
      "appointment.calendar_name",
      "appointment.title",
    ],
  },
  "appointment.cancelled": {
    key: "appointment.cancelled",
    category: "appointments",
    label: "Appointment cancelled",
    description: "Sent to the customer when an appointment is cancelled.",
    defaultSubject: "Your appointment with {{business.name}} was cancelled",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> on {{appointment.start_at}} has been cancelled.</p>
      <p>If you have questions, please contact us.</p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "appointment.start_at",
      "appointment.calendar_name",
      "appointment.title",
    ],
  },
  "appointment.rescheduled": {
    key: "appointment.rescheduled",
    category: "appointments",
    label: "Appointment rescheduled",
    description: "Sent to the customer when an appointment time changes.",
    defaultSubject: "Your appointment with {{business.name}} was rescheduled",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> has been rescheduled.</p>
      <p><strong>Previous time:</strong> {{appointment.previous_start_at}}</p>
      <p><strong>New time:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "appointment.start_at",
      "appointment.previous_start_at",
      "appointment.calendar_name",
      "appointment.title",
    ],
  },
  "invoice.sent": {
    key: "invoice.sent",
    category: "invoices",
    label: "Invoice sent",
    description: "Sent to the customer when an invoice is marked as sent.",
    defaultSubject: "Invoice {{invoice.number}} from {{business.name}}",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Please find invoice <strong>{{invoice.number}}</strong> from {{business.name}}.</p>
      <p><strong>Total:</strong> {{invoice.total}}</p>
      <p><strong>Due:</strong> {{invoice.due_date}}</p>
      <p><a href="{{invoice.public_url}}">View invoice</a></p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "invoice.number",
      "invoice.total",
      "invoice.due_date",
      "invoice.public_url",
    ],
  },
  "invoice.payment_link": {
    key: "invoice.payment_link",
    category: "invoices",
    label: "Payment link",
    description: "Sent when a payment link is created for an invoice.",
    defaultSubject: "Pay invoice {{invoice.number}} from {{business.name}}",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>You can pay invoice <strong>{{invoice.number}}</strong> online.</p>
      <p><strong>Amount due:</strong> {{invoice.balance_due}}</p>
      <p><a href="{{payment_link}}">Pay now</a></p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "invoice.number",
      "invoice.balance_due",
      "payment_link",
      "invoice.public_url",
    ],
  },
  "invoice.paid_receipt": {
    key: "invoice.paid_receipt",
    category: "invoices",
    label: "Payment receipt",
    description: "Sent when a payment is recorded for an invoice.",
    defaultSubject: "Payment received for invoice {{invoice.number}}",
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Thank you — we received your payment for invoice <strong>{{invoice.number}}</strong>.</p>
      <p><strong>Amount paid:</strong> {{payment.amount}}</p>
      <p><strong>Date:</strong> {{payment.date}}</p>
    `),
    variables: [
      "business.name",
      "contact.name",
      "invoice.number",
      "payment.amount",
      "payment.date",
    ],
  },
};

export const EMAIL_TYPE_CATEGORY_ORDER: EmailTypeCategory[] = [
  "membership",
  "appointments",
  "invoices",
];

export function getConfigurableEmailTypeDefinition(
  emailType: string,
): EmailTypeDefinition | undefined {
  return CONFIGURABLE_EMAIL_TYPE_REGISTRY[emailType];
}

export function listConfigurableEmailTypes(): EmailTypeDefinition[] {
  return Object.values(CONFIGURABLE_EMAIL_TYPE_REGISTRY);
}
