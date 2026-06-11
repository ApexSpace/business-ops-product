/** Gmail: "On Wed, 10 Jun 2026 at 15:26, Name <email> wrote:" */
const GMAIL_ON_WROTE_WITH_SPACE = /\sOn .+? wrote:?\s*/i;
/** Quote block starts the body (no reply text above it) */
const GMAIL_ON_WROTE_AT_START = /^On .+? wrote:?\s/im;
/** HTML collapsed: "replyOn Wed..." (no separator before On) */
const GMAIL_ON_WROTE_AFTER_WORD = /([a-zA-Z0-9!?.,])On .+? wrote:?\s*/i;
const OUTLOOK_ORIGINAL_MESSAGE = /\n-{2,}\s*Original Message\s*-{2,}/i;
const OUTLOOK_FROM_SENT = /\nFrom:\s*.+\nSent:\s*/is;
const ORPHAN_WROTE_LINE = /^.+@[^\s>]+>\s*wrote:?\s*$/i;
const ORPHAN_ON_WROTE_LINE = /^On .+ wrote:?\s*$/i;

const QUOTE_START_PATTERNS = [
  GMAIL_ON_WROTE_AT_START,
  GMAIL_ON_WROTE_WITH_SPACE,
  GMAIL_ON_WROTE_AFTER_WORD,
  OUTLOOK_ORIGINAL_MESSAGE,
  OUTLOOK_FROM_SENT,
];

/** Returns the customer's new reply text without quoted prior messages. */
export function extractInboundEmailBody(
  text?: string | null,
  html?: string | null,
): string | null {
  const source = pickBodySource(text, html);
  if (!source) {
    return null;
  }

  const stripped = stripQuotedReply(source);
  return stripped.trim() || null;
}

function pickBodySource(text?: string | null, html?: string | null): string | null {
  const plain = text?.trim();
  if (plain) {
    return normalizeEmailBodyText(plain);
  }

  const markup = html?.trim();
  if (!markup) {
    return null;
  }

  return normalizeEmailBodyText(htmlToPlainText(markup));
}

function normalizeEmailBodyText(value: string): string {
  return value
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[\u00a0\u202f\u2007\u3000]/g, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(?:div|p|blockquote|li|tr|table)\s*>/gi, '\n')
    .replace(/<\s*(?:div|p|blockquote|li|tr|table)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function htmlToPlainText(html: string): string {
  const withoutQuotes = html.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '');
  return normalizeEmailBodyText(withoutQuotes);
}

function findQuoteStartIndex(body: string): number | null {
  let earliest: number | null = null;

  for (const pattern of QUOTE_START_PATTERNS) {
    const match = body.match(pattern);
    if (match?.index === undefined) {
      continue;
    }

    const start =
      pattern === GMAIL_ON_WROTE_AFTER_WORD ? match.index + 1 : match.index;
    if (start >= 0 && (earliest === null || start < earliest)) {
      earliest = start;
    }
  }

  return earliest;
}

function stripQuotedReply(text: string): string {
  let body = normalizeEmailBodyText(text);

  const quoteStart = findQuoteStartIndex(body);
  if (quoteStart !== null) {
    body = body.slice(0, quoteStart);
  }

  body = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) {
        return false;
      }
      if (line.startsWith('>')) {
        return false;
      }
      if (ORPHAN_WROTE_LINE.test(line)) {
        return false;
      }
      if (ORPHAN_ON_WROTE_LINE.test(line)) {
        return false;
      }
      return true;
    })
    .join('\n');

  return body.trim();
}
