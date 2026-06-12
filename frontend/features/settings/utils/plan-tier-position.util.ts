export type TierPosition = "lowest" | "middle" | "highest" | "only" | "unknown";

export function getTierPosition(
  currentIndex: number,
  tierCount: number,
): TierPosition {
  if (tierCount <= 0 || currentIndex < 0) return "unknown";
  if (tierCount === 1) return "only";
  if (currentIndex === 0) return "lowest";
  if (currentIndex === tierCount - 1) return "highest";
  return "middle";
}

export function canUpgrade(position: TierPosition): boolean {
  return position === "lowest" || position === "middle";
}

export function canDowngrade(position: TierPosition): boolean {
  return position === "middle" || position === "highest";
}

export function canChangePlanBothWays(position: TierPosition): boolean {
  return position === "middle";
}

export function getPlanChangeButtonLabel(position: TierPosition): string {
  if (position === "middle") return "Upgrade / Downgrade plan";
  if (position === "lowest") return "Upgrade plan";
  if (position === "highest") return "Downgrade plan";
  return "Change plan";
}
