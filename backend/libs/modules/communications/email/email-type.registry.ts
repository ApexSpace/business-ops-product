export type EmailTypeCategory =
  | 'membership'
  | 'appointments'
  | 'invoices'
  | 'auth';

export interface EmailTypeDefinition {
  key: string;
  category: EmailTypeCategory;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultSubject: string;
  defaultHtmlBody: string;
  defaultTextBody?: string;
  variables: string[];
  /** Platform-only emails; not listed in business preferences/templates. */
  systemOnly?: boolean;
  /** Whether a business can toggle or customize this type. */
  businessConfigurable?: boolean;
}

const WRAPPER = (body: string) =>
  `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">${body}</div>`;

export const EMAIL_TYPE_REGISTRY: Record<string, EmailTypeDefinition> = {
  'membership.invite': {
    key: 'membership.invite',
    category: 'membership',
    label: 'Team invite',
    description: 'Sent when a team member is invited to join the business.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'You have been invited to join {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi,</p>
      <p>{{inviter.name}} invited you to join <strong>{{business.name}}</strong>.</p>
      <p><a href="{{invite_link}}">Accept invitation</a></p>
      <p>If you did not expect this email, you can ignore it.</p>
    `),
    defaultTextBody:
      'Hi,\n\n{{inviter.name}} invited you to join {{business.name}}.\n\nAccept invitation: {{invite_link}}\n\nIf you did not expect this email, you can ignore it.',
    variables: [
      'invitee.email',
      'inviter.name',
      'business.name',
      'invite_link',
    ],
  },
  'appointment.confirmation': {
    key: 'appointment.confirmation',
    category: 'appointments',
    label: 'Booking confirmation',
    description: 'Sent to the customer when an appointment is created.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your appointment with {{business.name}} is confirmed',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> is confirmed.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
      <p>We look forward to seeing you.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYour appointment with {{business.name}} is confirmed.\n\nWhen: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}\n\nWe look forward to seeing you.',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'appointment.owner_notification': {
    key: 'appointment.owner_notification',
    category: 'appointments',
    label: 'New booking notification',
    description: 'Sent to business owners when a new appointment is created.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'New booking: {{contact.name}} on {{appointment.start_at}}',
    defaultHtmlBody: WRAPPER(`
      <p>A new booking was received for <strong>{{business.name}}</strong>.</p>
      <p><strong>Customer:</strong> {{contact.name}}</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
    `),
    defaultTextBody:
      'A new booking was received for {{business.name}}.\n\nCustomer: {{contact.name}}\nWhen: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}',
    variables: [
      'business.name',
      'contact.name',
      'contact.email',
      'appointment.start_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'appointment.reminder': {
    key: 'appointment.reminder',
    category: 'appointments',
    label: 'Appointment reminder',
    description: 'Sent to the customer before their appointment starts.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Reminder: your appointment with {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>This is a reminder about your upcoming appointment with <strong>{{business.name}}</strong>.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
      <p>We look forward to seeing you.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nReminder: your appointment with {{business.name}}.\n\nWhen: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'appointment.cancelled': {
    key: 'appointment.cancelled',
    category: 'appointments',
    label: 'Appointment cancelled',
    description: 'Sent to the customer when an appointment is cancelled.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your appointment with {{business.name}} was cancelled',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> on {{appointment.start_at}} has been cancelled.</p>
      <p>If you have questions, please contact us.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYour appointment with {{business.name}} on {{appointment.start_at}} has been cancelled.\n\nIf you have questions, please contact us.',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'appointment.rescheduled': {
    key: 'appointment.rescheduled',
    category: 'appointments',
    label: 'Appointment rescheduled',
    description: 'Sent to the customer when an appointment time changes.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your appointment with {{business.name}} was rescheduled',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> has been rescheduled.</p>
      <p><strong>Previous time:</strong> {{appointment.previous_start_at}}</p>
      <p><strong>New time:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYour appointment with {{business.name}} has been rescheduled.\n\nPrevious: {{appointment.previous_start_at}}\nNew: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.previous_start_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'invoice.sent': {
    key: 'invoice.sent',
    category: 'invoices',
    label: 'Invoice sent',
    description: 'Sent to the customer when an invoice is marked as sent.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Invoice {{invoice.number}} from {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Please find invoice <strong>{{invoice.number}}</strong> from {{business.name}}.</p>
      <p><strong>Total:</strong> {{invoice.total}}</p>
      <p><strong>Due:</strong> {{invoice.due_date}}</p>
      <p><a href="{{invoice.public_url}}">View invoice</a></p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nInvoice {{invoice.number}} from {{business.name}}.\nTotal: {{invoice.total}}\nDue: {{invoice.due_date}}\n\nView invoice: {{invoice.public_url}}',
    variables: [
      'business.name',
      'contact.name',
      'invoice.number',
      'invoice.total',
      'invoice.due_date',
      'invoice.public_url',
    ],
  },
  'invoice.payment_link': {
    key: 'invoice.payment_link',
    category: 'invoices',
    label: 'Payment link',
    description: 'Sent when a payment link is created for an invoice.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Pay invoice {{invoice.number}} from {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>You can pay invoice <strong>{{invoice.number}}</strong> online.</p>
      <p><strong>Amount due:</strong> {{invoice.balance_due}}</p>
      <p><a href="{{payment_link}}">Pay now</a></p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nPay invoice {{invoice.number}} from {{business.name}}.\nAmount due: {{invoice.balance_due}}\n\nPay now: {{payment_link}}',
    variables: [
      'business.name',
      'contact.name',
      'invoice.number',
      'invoice.balance_due',
      'payment_link',
      'invoice.public_url',
    ],
  },
  'invoice.paid_receipt': {
    key: 'invoice.paid_receipt',
    category: 'invoices',
    label: 'Payment receipt',
    description: 'Sent when a payment is recorded for an invoice.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Payment received for invoice {{invoice.number}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Thank you — we received your payment for invoice <strong>{{invoice.number}}</strong>.</p>
      <p><strong>Amount paid:</strong> {{payment.amount}}</p>
      <p><strong>Date:</strong> {{payment.date}}</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nThank you — we received your payment for invoice {{invoice.number}}.\nAmount paid: {{payment.amount}}\nDate: {{payment.date}}',
    variables: [
      'business.name',
      'contact.name',
      'invoice.number',
      'payment.amount',
      'payment.date',
    ],
  },
  'auth.password_reset': {
    key: 'auth.password_reset',
    category: 'auth',
    label: 'Password reset',
    description: 'Sent when a user requests a password reset link.',
    defaultEnabled: true,
    systemOnly: true,
    businessConfigurable: false,
    defaultSubject: 'Reset your password',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{user.name}},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="{{reset_link}}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `),
    defaultTextBody:
      'Hi {{user.name}},\n\nReset your password: {{reset_link}}\n\nIf you did not request this, you can ignore this email.',
    variables: ['user.name', 'user.email', 'reset_link'],
  },
  'auth.email_verification': {
    key: 'auth.email_verification',
    category: 'auth',
    label: 'Email verification',
    description: 'Sent to verify a new account email address.',
    defaultEnabled: true,
    systemOnly: true,
    businessConfigurable: false,
    defaultSubject: 'Verify your email address',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{user.name}},</p>
      <p>Please verify your email address to finish setting up your account.</p>
      <p><a href="{{verification_link}}">Verify email</a></p>
    `),
    defaultTextBody:
      'Hi {{user.name}},\n\nVerify your email: {{verification_link}}',
    variables: ['user.name', 'user.email', 'verification_link'],
  },
};

export const V1_EMAIL_TYPES = Object.keys(EMAIL_TYPE_REGISTRY);

export const BUSINESS_EMAIL_TYPES = V1_EMAIL_TYPES.filter(
  (key) => !EMAIL_TYPE_REGISTRY[key]?.systemOnly,
);

export function getEmailTypeDefinition(emailType: string): EmailTypeDefinition | null {
  return EMAIL_TYPE_REGISTRY[emailType] ?? null;
}

export function assertEmailType(emailType: string): EmailTypeDefinition {
  const def = getEmailTypeDefinition(emailType);
  if (!def) {
    throw new Error(`Unknown email type: ${emailType}`);
  }
  return def;
}

export function isBusinessConfigurableEmailType(emailType: string): boolean {
  const def = getEmailTypeDefinition(emailType);
  return !!def && def.businessConfigurable !== false && !def.systemOnly;
}

export function listEmailTypesByCategory(): Record<
  EmailTypeCategory,
  EmailTypeDefinition[]
> {
  const grouped: Record<EmailTypeCategory, EmailTypeDefinition[]> = {
    membership: [],
    appointments: [],
    invoices: [],
    auth: [],
  };
  for (const def of Object.values(EMAIL_TYPE_REGISTRY)) {
    grouped[def.category].push(def);
  }
  return grouped;
}
