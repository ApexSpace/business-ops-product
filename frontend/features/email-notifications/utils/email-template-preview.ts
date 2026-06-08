import { getConfigurableEmailTypeDefinition } from "@/features/email-notifications/constants/email-type-registry";

const BASE_SAMPLE_VARIABLES: Record<string, string> = {
  "business.name": "Sample Business",
  "contact.name": "Jane Customer",
  "contact.email": "customer@example.com",
  "invitee.email": "newmember@example.com",
  "inviter.name": "Alex Owner",
  invite_link: "https://example.com/accept-invite?token=sample",
  "appointment.start_at": "Mon, Jun 10 2026 at 2:00 PM",
  "appointment.end_at": "Mon, Jun 10 2026 at 3:00 PM",
  "appointment.calendar_name": "Consultations",
  "appointment.title": "Jane Customer - Consultations",
  "appointment.previous_start_at": "Mon, Jun 10 2026 at 1:00 PM",
  "invoice.number": "INV-1001",
  "invoice.total": "$250.00",
  "invoice.due_date": "Jul 1, 2026",
  "invoice.balance_due": "$250.00",
  "invoice.public_url": "https://example.com/invoice/sample",
  payment_link: "https://example.com/invoice/sample",
  "payment.amount": "$250.00",
  "payment.date": "Jun 6, 2026",
  "user.name": "Alex Owner",
  "user.email": "alex@example.com",
  reset_link: "https://example.com/reset-password?token=sample",
  verification_link: "https://example.com/verify-email?token=sample",
};

export function buildEmailTemplateSampleVariables(
  emailType: string,
  overrides?: Record<string, string>,
): Record<string, string> {
  const def = getConfigurableEmailTypeDefinition(emailType);
  const samples = { ...BASE_SAMPLE_VARIABLES };

  for (const key of def?.variables ?? []) {
    if (!samples[key]) {
      samples[key] = `[${key}]`;
    }
  }

  return { ...samples, ...(overrides ?? {}) };
}

export function renderEmailTemplateVariables(
  text: string,
  variables: Record<string, string>,
): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function previewEmailTemplateContent(
  emailType: string,
  subject: string,
  htmlBody: string,
  overrides?: Record<string, string>,
): { subject: string; htmlBody: string } {
  const samples = buildEmailTemplateSampleVariables(emailType, overrides);
  return {
    subject: renderEmailTemplateVariables(subject, samples),
    htmlBody: renderEmailTemplateVariables(htmlBody, samples),
  };
}
