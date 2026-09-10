const PROVIDER_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  x: "X",
  twitter: "X",
};

/** Display name for a Social Planner provider key. */
export function socialProviderLabel(providerKey: string): string {
  const key = providerKey.trim().toLowerCase();
  return PROVIDER_LABELS[key] ?? providerKey;
}

const TARGET_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/** Human-readable target publish status. */
export function socialTargetStatusLabel(status: string): string {
  const key = status.trim().toUpperCase();
  return TARGET_STATUS_LABELS[key] ?? status.toLowerCase();
}
