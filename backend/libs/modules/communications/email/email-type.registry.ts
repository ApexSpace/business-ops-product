export type EmailTypeCategory =
  | 'membership'
  | 'appointments'
  | 'invoices'
  | 'gift_cards'
  | 'packages'
  | 'auth'
  | 'automation'
  | 'platform';

export interface EmailTypeDefinition {
  key: string;
  category: EmailTypeCategory;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultSubject: string;
  defaultHtmlBody: string;
  defaultTextBody?: string;
  /**
   * Short SMS body with the same {{variable}} placeholders as email templates.
   * Required for business-configurable types that support EMAIL/SMS channel override.
   */
  defaultSmsBody?: string;
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
    defaultSmsBody:
      '{{inviter.name}} invited you to join {{business.name}}. Accept: {{invite_link}}',
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
      <p><a href="{{appointment.manage_url}}">Manage your appointment</a></p>
      <p>We look forward to seeing you.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYour appointment with {{business.name}} is confirmed.\n\nWhen: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}\n\nManage your appointment: {{appointment.manage_url}}\n\nWe look forward to seeing you.',
    defaultSmsBody:
      'Hi {{contact.name}}, your appointment with {{business.name}} is confirmed for {{appointment.start_at}}. Manage: {{appointment.manage_url}}',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
      'appointment.calendar_name',
      'appointment.title',
      'appointment.manage_url',
      'appointment.cancellation_policy',
      'appointment.cancellation_policy_sms',
    ],
  },
  'appointment.booked_for': {
    key: 'appointment.booked_for',
    category: 'appointments',
    label: 'Booked-for notification',
    description:
      'Sent to the guest when someone else books an appointment on their behalf.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject:
      '{{booked_by.name}} booked an appointment for you at {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{booked_for.name}},</p>
      <p><strong>{{booked_by.name}}</strong> booked an appointment for you at <strong>{{business.name}}</strong>.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Service:</strong> {{appointment.calendar_name}}</p>
      <p>We look forward to seeing you.</p>
    `),
    defaultTextBody:
      'Hi {{booked_for.name}},\n\n{{booked_by.name}} booked an appointment for you at {{business.name}}.\n\nWhen: {{appointment.start_at}}\nService: {{appointment.calendar_name}}\n\nWe look forward to seeing you.',
    defaultSmsBody:
      'Hi {{booked_for.name}}, {{booked_by.name}} booked you at {{business.name}} for {{appointment.start_at}}.',
    variables: [
      'business.name',
      'booked_for.name',
      'booked_for.email',
      'booked_by.name',
      'booked_by.email',
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
    defaultSmsBody:
      'New booking at {{business.name}}: {{contact.name}} on {{appointment.start_at}}.',
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
      <p><a href="{{appointment.manage_url}}">Manage your appointment</a></p>
      <p>We look forward to seeing you.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nReminder: your appointment with {{business.name}}.\n\nWhen: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}\n\nManage your appointment: {{appointment.manage_url}}',
    defaultSmsBody:
      'Hi {{contact.name}}, reminder: your appointment with {{business.name}} is on {{appointment.start_at}}. Manage: {{appointment.manage_url}}',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
      'appointment.calendar_name',
      'appointment.title',
      'appointment.manage_url',
      'appointment.cancellation_policy',
      'appointment.cancellation_policy_sms',
    ],
  },
  'appointment.express_complete': {
    key: 'appointment.express_complete',
    category: 'appointments',
    label: 'Express Booking completion link',
    description:
      'Sent to the customer so they can finish an Express Booking started by staff.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Complete your booking with {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p><strong>{{business.name}}</strong> started a booking for you. Please complete your details using the link below.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Service:</strong> {{appointment.service_name}}</p>
      <p><strong>Complete by:</strong> {{express.expires_at}}</p>
      <p><a href="{{express.complete_url}}">Complete your booking</a></p>
      <p>If the link expires, contact the business to get a new one.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\n{{business.name}} started a booking for you.\n\nWhen: {{appointment.start_at}}\nService: {{appointment.service_name}}\nComplete by: {{express.expires_at}}\n\nComplete your booking: {{express.complete_url}}',
    defaultSmsBody:
      'Hi {{contact.name}} - {{business.name}} started a booking for you. {{appointment.start_at}} - {{appointment.service_name}}. Complete by {{express.expires_at}}.\n{{express.complete_url}}',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
      'appointment.service_name',
      'appointment.title',
      'express.expires_at',
      'express.complete_url',
    ],
  },
  'appointment.express_expired': {
    key: 'appointment.express_expired',
    category: 'appointments',
    label: 'Express Booking expired',
    description:
      'Sent when an Express Booking is cancelled because the client did not finish in time.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your booking link with {{business.name}} expired',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your booking with <strong>{{business.name}}</strong> was cancelled because it was not completed in time.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Service:</strong> {{appointment.service_name}}</p>
      <p>Please contact the business if you still need an appointment.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYour booking with {{business.name}} was cancelled because it was not completed in time.\n\nWhen: {{appointment.start_at}}\nService: {{appointment.service_name}}\n\nPlease contact the business if you still need an appointment.',
    defaultSmsBody:
      'Hi {{contact.name}}, your booking with {{business.name}} on {{appointment.start_at}} expired and was cancelled.',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
      'appointment.service_name',
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
    defaultSmsBody:
      'Hi {{contact.name}}, your appointment with {{business.name}} on {{appointment.start_at}} was cancelled.',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'appointment.ready': {
    key: 'appointment.ready',
    category: 'appointments',
    label: 'Ready for service',
    description:
      'Sent to the customer when their provider is ready and they should come in.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your appointment with {{business.name}} is ready',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Your appointment with <strong>{{business.name}}</strong> is ready.</p>
      <p><strong>When:</strong> {{appointment.start_at}}</p>
      <p><strong>Calendar:</strong> {{appointment.calendar_name}}</p>
      <p>Please come in at your earliest convenience.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYour appointment with {{business.name}} is ready.\n\nWhen: {{appointment.start_at}}\nCalendar: {{appointment.calendar_name}}\n\nPlease come in at your earliest convenience.',
    defaultSmsBody:
      'Hi {{contact.name}}, your appointment with {{business.name}} is ready. Please come in.',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.end_at',
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
    defaultSmsBody:
      'Hi {{contact.name}}, your appointment with {{business.name}} was rescheduled to {{appointment.start_at}}.',
    variables: [
      'business.name',
      'contact.name',
      'appointment.start_at',
      'appointment.previous_start_at',
      'appointment.calendar_name',
      'appointment.title',
    ],
  },
  'booking.waitlist_joined': {
    key: 'booking.waitlist_joined',
    category: 'appointments',
    label: 'Waitlist joined (client)',
    description: 'Sent to the client when they join the online booking waitlist.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'You are on the waitlist at {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>You have been added to the waitlist at <strong>{{business.name}}</strong>.</p>
      <p><strong>Service:</strong> {{waitlist.service_name}}</p>
      <p><strong>Date:</strong> {{waitlist.preferred_date}}</p>
      <p><strong>Staff:</strong> {{waitlist.staff_name}}</p>
      <p>We will contact you when an opening becomes available.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYou have been added to the waitlist at {{business.name}}.\n\nService: {{waitlist.service_name}}\nDate: {{waitlist.preferred_date}}\nStaff: {{waitlist.staff_name}}\n\nWe will contact you when an opening becomes available.',
    defaultSmsBody:
      'Hi {{contact.name}}, you joined the waitlist at {{business.name}} for {{waitlist.service_name}} on {{waitlist.preferred_date}}.',
    variables: [
      'business.name',
      'contact.name',
      'waitlist.service_name',
      'waitlist.preferred_date',
      'waitlist.staff_name',
    ],
  },
  'booking.waitlist_staff_notification': {
    key: 'booking.waitlist_staff_notification',
    category: 'appointments',
    label: 'Waitlist joined (staff)',
    description: 'Sent to staff when a client joins the online booking waitlist.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'New waitlist entry: {{contact.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>A client joined the waitlist at <strong>{{business.name}}</strong>.</p>
      <p><strong>Client:</strong> {{contact.name}}</p>
      <p><strong>Service:</strong> {{waitlist.service_name}}</p>
      <p><strong>Date:</strong> {{waitlist.preferred_date}}</p>
      <p><strong>Staff:</strong> {{waitlist.staff_name}}</p>
    `),
    defaultTextBody:
      'A client joined the waitlist at {{business.name}}.\n\nClient: {{contact.name}}\nService: {{waitlist.service_name}}\nDate: {{waitlist.preferred_date}}\nStaff: {{waitlist.staff_name}}',
    defaultSmsBody:
      'New waitlist entry at {{business.name}}: {{contact.name}} for {{waitlist.service_name}} on {{waitlist.preferred_date}}.',
    variables: [
      'business.name',
      'contact.name',
      'waitlist.service_name',
      'waitlist.preferred_date',
      'waitlist.staff_name',
    ],
  },
  'booking.waitlist_opening_available': {
    key: 'booking.waitlist_opening_available',
    category: 'appointments',
    label: 'Waitlist opening available',
    description: 'Sent to staff when a waitlist entry has a matching calendar opening.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Waitlist opening available for {{contact.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>An opening is now available for a waitlist entry at <strong>{{business.name}}</strong>.</p>
      <p><strong>Client:</strong> {{contact.name}}</p>
      <p><strong>Service:</strong> {{waitlist.service_name}}</p>
      <p><strong>Date:</strong> {{waitlist.preferred_date}}</p>
      <p><strong>Staff:</strong> {{waitlist.staff_name}}</p>
      <p>Review the waitlist in your calendar to book this client.</p>
    `),
    defaultTextBody:
      'An opening is now available for a waitlist entry at {{business.name}}.\n\nClient: {{contact.name}}\nService: {{waitlist.service_name}}\nDate: {{waitlist.preferred_date}}\nStaff: {{waitlist.staff_name}}\n\nReview the waitlist in your calendar to book this client.',
    defaultSmsBody:
      'Waitlist opening at {{business.name}} for {{contact.name}} ({{waitlist.service_name}} on {{waitlist.preferred_date}}).',
    variables: [
      'business.name',
      'contact.name',
      'waitlist.service_name',
      'waitlist.preferred_date',
      'waitlist.staff_name',
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
    defaultSmsBody:
      'Hi {{contact.name}}, invoice {{invoice.number}} from {{business.name}} ({{invoice.total}}). View: {{invoice.public_url}}',
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
    defaultSmsBody:
      'Hi {{contact.name}}, pay invoice {{invoice.number}} ({{invoice.balance_due}}): {{payment_link}}',
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
      {{payment.tip}}
      <p><strong>Date:</strong> {{payment.date}}</p>
      {{receipt.providersBlock}}
      {{receipt.footerBlock}}
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nThank you — we received your payment for invoice {{invoice.number}}.\nAmount paid: {{payment.amount}}\nDate: {{payment.date}}',
    defaultSmsBody:
      'Hi {{contact.name}}, payment of {{payment.amount}} received for invoice {{invoice.number}}.',
    variables: [
      'business.name',
      'contact.name',
      'invoice.number',
      'payment.amount',
      'payment.date',
      'payment.tip',
      'receipt.providersBlock',
      'receipt.footerBlock',
    ],
  },
  'gift_card.delivery': {
    key: 'gift_card.delivery',
    category: 'gift_cards',
    label: 'Gift card delivery',
    description:
      'Sent to the recipient when a gift card is purchased or sent digitally.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'You received a gift card from {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>You received a gift card from <strong>{{business.name}}</strong>.</p>
      <p><strong>Card number:</strong> {{gift_card.number}}</p>
      <p><strong>Balance:</strong> {{gift_card.balance}}</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nYou received a gift card from {{business.name}}.\nCard number: {{gift_card.number}}\nBalance: {{gift_card.balance}}',
    defaultSmsBody:
      'Hi {{contact.name}}, you received a gift card from {{business.name}}. Number: {{gift_card.number}}, Balance: {{gift_card.balance}}.',
    variables: [
      'business.name',
      'contact.name',
      'gift_card.number',
      'gift_card.balance',
      'gift_card.promotion_name',
      'gift_card.promotion_description',
      'gift_card.disclaimer',
    ],
  },
  'gift_card.purchase_confirmation': {
    key: 'gift_card.purchase_confirmation',
    category: 'gift_cards',
    label: 'Gift card purchase confirmation',
    description: 'Sent to the purchaser after an online gift card sale.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your gift card purchase from {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Thank you for your gift card purchase from <strong>{{business.name}}</strong>.</p>
      <p><strong>Amount paid:</strong> {{gift_card.amount_paid}}</p>
      <p><strong>Gift card value:</strong> {{gift_card.balance}}</p>
      <p><strong>Card number:</strong> {{gift_card.number}}</p>
      <p>The gift card will be sent to {{gift_card.recipient_email}}.</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nThank you for your gift card purchase from {{business.name}}.\nAmount paid: {{gift_card.amount_paid}}\nGift card value: {{gift_card.balance}}\nCard number: {{gift_card.number}}\nRecipient: {{gift_card.recipient_email}}',
    defaultSmsBody:
      'Hi {{contact.name}}, gift card purchase confirmed at {{business.name}}. Card {{gift_card.number}}, value {{gift_card.balance}}.',
    variables: [
      'business.name',
      'contact.name',
      'gift_card.number',
      'gift_card.balance',
      'gift_card.amount_paid',
      'gift_card.recipient_email',
    ],
  },
  'gift_card.internal_notification': {
    key: 'gift_card.internal_notification',
    category: 'gift_cards',
    label: 'Gift card sale notification',
    description: 'Sent to the business when an online gift card is sold.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'New online gift card sold — {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>A new online gift card was sold for <strong>{{business.name}}</strong>.</p>
      <p><strong>Card number:</strong> {{gift_card.number}}</p>
      <p><strong>Value:</strong> {{gift_card.balance}}</p>
      <p><strong>Purchaser:</strong> {{gift_card.purchaser_name}}</p>
      <p><strong>Recipient:</strong> {{gift_card.recipient_name}}</p>
    `),
    defaultTextBody:
      'New gift card sold for {{business.name}}.\nNumber: {{gift_card.number}}\nValue: {{gift_card.balance}}\nPurchaser: {{gift_card.purchaser_name}}\nRecipient: {{gift_card.recipient_name}}',
    defaultSmsBody:
      'New gift card sold at {{business.name}}: {{gift_card.number}} ({{gift_card.balance}}). Purchaser: {{gift_card.purchaser_name}}.',
    variables: [
      'business.name',
      'gift_card.number',
      'gift_card.balance',
      'gift_card.purchaser_name',
      'gift_card.recipient_name',
    ],
  },
  'package.purchase_confirmation': {
    key: 'package.purchase_confirmation',
    category: 'packages',
    label: 'Package purchase confirmation',
    description: 'Sent to the purchaser after an online package sale.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'Your package purchase from {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{contact.name}},</p>
      <p>Thank you for your package purchase from <strong>{{business.name}}</strong>.</p>
      <p><strong>Package:</strong> {{package.name}}</p>
      <p><strong>Amount paid:</strong> {{package.amount_paid}}</p>
      <p><strong>Includes:</strong> {{package.includes}}</p>
      <p><strong>Expires:</strong> {{package.expiration_date}}</p>
    `),
    defaultTextBody:
      'Hi {{contact.name}},\n\nThank you for your package purchase from {{business.name}}.\nPackage: {{package.name}}\nAmount paid: {{package.amount_paid}}\nIncludes: {{package.includes}}\nExpires: {{package.expiration_date}}',
    defaultSmsBody:
      'Hi {{contact.name}}, package {{package.name}} purchased from {{business.name}} ({{package.amount_paid}}).',
    variables: [
      'business.name',
      'contact.name',
      'package.name',
      'package.amount_paid',
      'package.total_qty',
      'package.includes',
      'package.expiration_date',
    ],
  },
  'package.internal_notification': {
    key: 'package.internal_notification',
    category: 'packages',
    label: 'Package sale notification',
    description: 'Sent to the business when an online package is sold.',
    defaultEnabled: true,
    businessConfigurable: true,
    defaultSubject: 'New online package sold — {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>A new online package was sold for <strong>{{business.name}}</strong>.</p>
      <p><strong>Package:</strong> {{package.name}}</p>
      <p><strong>Amount paid:</strong> {{package.amount_paid}}</p>
      <p><strong>Client:</strong> {{package.client_name}}</p>
      <p><strong>Purchaser:</strong> {{package.purchaser_name}}</p>
    `),
    defaultTextBody:
      'New package sold for {{business.name}}.\nPackage: {{package.name}}\nAmount paid: {{package.amount_paid}}\nClient: {{package.client_name}}\nPurchaser: {{package.purchaser_name}}',
    defaultSmsBody:
      'New package sold at {{business.name}}: {{package.name}} ({{package.amount_paid}}) for {{package.client_name}}.',
    variables: [
      'business.name',
      'package.name',
      'package.amount_paid',
      'package.client_name',
      'package.purchaser_name',
    ],
  },
  'automation.workflow': {
    key: 'automation.workflow',
    category: 'automation',
    label: 'Automation email',
    description: 'Sent by a workflow automation step.',
    defaultEnabled: true,
    businessConfigurable: false,
    defaultSubject: 'Notification from {{business.name}}',
    defaultHtmlBody: WRAPPER('<p>{{contact.name}}</p>'),
    defaultTextBody: 'Notification from {{business.name}}',
    variables: ['business.name', 'contact.name', 'contact.email'],
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
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `),
    defaultTextBody:
      'Hi {{user.name}},\n\nReset your password: {{reset_link}}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.',
    variables: ['user.name', 'user.email', 'reset_link'],
  },
  'auth.password_changed': {
    key: 'auth.password_changed',
    category: 'auth',
    label: 'Password changed',
    description:
      'Sent after a password reset succeeds to confirm the account change.',
    defaultEnabled: true,
    systemOnly: true,
    businessConfigurable: false,
    defaultSubject: 'Your password was changed',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{user.name}},</p>
      <p>Your password was changed successfully.</p>
      <p>If you did not make this change, contact support immediately.</p>
    `),
    defaultTextBody:
      'Hi {{user.name}},\n\nYour password was changed successfully.\n\nIf you did not make this change, contact support immediately.',
    variables: ['user.name', 'user.email'],
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
  'platform.addon_packaging_change': {
    key: 'platform.addon_packaging_change',
    category: 'platform',
    label: 'Add-on packaging change',
    description:
      'Sent to business owners when platform admin changes how an add-on is packaged for their subscription.',
    defaultEnabled: true,
    systemOnly: true,
    businessConfigurable: false,
    defaultSubject: 'Update about {{addon.name}} on {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{owner.name}},</p>
      <p>We updated how <strong>{{addon.name}}</strong> is packaged for <strong>{{business.name}}</strong>.</p>
      <p><strong>What this means:</strong> {{change.summary}}</p>
      <p>{{change.detail}}</p>
      <p>{{change.effective}}</p>
    `),
    defaultTextBody:
      'Hi {{owner.name}},\n\nWe updated how {{addon.name}} is packaged for {{business.name}}.\n\n{{change.summary}}\n{{change.detail}}\n{{change.effective}}\n',
    variables: [
      'owner.name',
      'owner.email',
      'business.name',
      'addon.name',
      'change.summary',
      'change.detail',
      'change.effective',
    ],
  },
  'platform.entitlement_change': {
    key: 'platform.entitlement_change',
    category: 'platform',
    label: 'Entitlement change notice',
    description:
      'Sent to business owners for tier price, capability, or service packaging changes managed in Operations.',
    defaultEnabled: true,
    systemOnly: true,
    businessConfigurable: false,
    defaultSubject: 'Important update for {{business.name}}',
    defaultHtmlBody: WRAPPER(`
      <p>Hi {{owner.name}},</p>
      <p><strong>{{change.summary}}</strong></p>
      <p style="white-space: pre-wrap; margin: 16px 0;">{{change.detail}}</p>
      <p><strong>{{change.effective}}</strong></p>
      <p style="color: #555; font-size: 13px;">Reply to this email or contact support if you have questions about upgrading or purchasing add-ons.</p>
    `),
    defaultTextBody:
      'Hi {{owner.name}},\n\n{{change.summary}}\n\n{{change.detail}}\n\n{{change.effective}}\n',
    variables: [
      'owner.name',
      'owner.email',
      'business.name',
      'change.summary',
      'change.detail',
      'change.effective',
    ],
  },
};

export const V1_EMAIL_TYPES = Object.keys(EMAIL_TYPE_REGISTRY);

export const BUSINESS_EMAIL_TYPES = V1_EMAIL_TYPES.filter(
  (key) => !EMAIL_TYPE_REGISTRY[key]?.systemOnly,
);

export function getEmailTypeDefinition(
  emailType: string,
): EmailTypeDefinition | null {
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
    gift_cards: [],
    packages: [],
    auth: [],
    automation: [],
    platform: [],
  };
  for (const def of Object.values(EMAIL_TYPE_REGISTRY)) {
    grouped[def.category].push(def);
  }
  return grouped;
}
