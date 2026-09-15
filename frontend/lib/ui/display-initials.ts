/**
 * Derives 1–2 letter initials for profile avatars.
 * Multi-word names use the first letter of the first two words (e.g. "Mirza Shahbaz" → "MS").
 * Single-word names use the first two characters (e.g. "Mirza" → "MI").
 */
export function displayInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "—") {
    return "?";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}
