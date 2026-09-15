export type SmsComplianceKeyword =
  | 'opt_out'
  | 'opt_in'
  | 'help'
  | null;

const OPT_OUT_KEYWORDS = new Set([
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
]);

const OPT_IN_KEYWORDS = new Set(['START', 'UNSTOP']);

const HELP_KEYWORDS = new Set(['HELP', 'INFO']);

export function parseSmsComplianceKeyword(
  body: string | null | undefined,
): SmsComplianceKeyword {
  const normalized = body?.trim().toUpperCase() ?? '';
  if (!normalized) return null;
  if (OPT_OUT_KEYWORDS.has(normalized)) return 'opt_out';
  if (OPT_IN_KEYWORDS.has(normalized)) return 'opt_in';
  if (HELP_KEYWORDS.has(normalized)) return 'help';
  return null;
}

export function buildOptOutTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been unsubscribed and will no longer receive SMS messages from this number. Reply START to resubscribe.</Message></Response>';
}

export function buildOptInTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been resubscribed to SMS notifications from this number. Reply STOP to unsubscribe.</Message></Response>';
}

export function buildHelpTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message>PandaCue SMS: Reply STOP to unsubscribe. For support, contact your business directly.</Message></Response>';
}

export function buildEmptyTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}
