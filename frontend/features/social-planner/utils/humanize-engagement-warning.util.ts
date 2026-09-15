import { socialProviderLabel } from "@/features/social-planner/utils/social-provider-label.util";

const PROVIDER_PREFIX =
  /^(facebook|instagram|youtube|tiktok|pinterest|linkedin|x|twitter):([^\s:]+):\s*(.*)$/i;

/** Strip tags and collapse whitespace from provider/API warning text. */
function stripMarkup(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeApiDocNoise(text: string): boolean {
  return /\/youtube\/v3|googleapis|commentThreads|#videoId|<|>/.test(text);
}

/**
 * Turn raw channel sync warnings into short, user-facing copy.
 * Never surfaces HTML, API doc paths, or opaque provider:id prefixes alone.
 */
export function humanizeEngagementWarning(raw: string): string {
  const stripped = stripMarkup(raw);
  if (!stripped) {
    return "Could not sync comments from a channel.";
  }

  const match = stripped.match(PROVIDER_PREFIX);
  const providerKey = match?.[1]?.toLowerCase();
  const message = (match?.[3] ?? stripped).trim();
  const channel = providerKey ? socialProviderLabel(providerKey) : null;

  if (
    /videoId|could not be found|not found|unavailable|deleted/i.test(stripped)
  ) {
    return channel
      ? `${channel}: video not found or unavailable.`
      : "A linked video was not found or is unavailable.";
  }

  if (/permission|oauth|authorized|access denied|token/i.test(message)) {
    return channel
      ? `${channel}: reconnect this channel in Integrations.`
      : "Reconnect the channel in Integrations.";
  }

  if (/rate.?limit|quota|too many requests/i.test(message)) {
    return channel
      ? `${channel}: temporarily rate-limited. Try again shortly.`
      : "A channel is temporarily rate-limited. Try again shortly.";
  }

  if (looksLikeApiDocNoise(stripped) || looksLikeApiDocNoise(message)) {
    return channel
      ? `${channel}: could not load comments for this post.`
      : "Could not load comments for a post.";
  }

  const safe = message
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  if (channel && safe.length > 8) {
    return `${channel}: ${safe}`;
  }

  return channel
    ? `${channel}: could not sync comments.`
    : "Could not sync comments from a channel.";
}

/** Deduped human-readable warnings for UI banners. */
export function humanizeEngagementWarnings(warnings: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const warning of warnings) {
    const text = humanizeEngagementWarning(warning);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}
