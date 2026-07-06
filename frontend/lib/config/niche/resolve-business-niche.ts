import type { SnapshotContext } from "@/features/platform/types/snapshot";
import type { Business } from "@/lib/types/api";
import {
  DEFAULT_BUSINESS_NICHE_PROFILE,
  MEDSPA_BUSINESS_NICHE_PROFILE,
} from "./profiles";
import type { BusinessNicheProfile } from "./types";

const MEDSPA_SLUGS = new Set([
  "medspa",
  "medical-spa",
  "medical_spa",
  "aesthetic-clinic",
  "aesthetic_clinic",
  "spa",
]);

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isMedspaProfileCandidate(value: string | null | undefined): boolean {
  const normalized = normalize(value);
  if (!normalized) return false;
  if (MEDSPA_SLUGS.has(normalized)) return true;
  return /(medspa|medical spa|aesthetic|injectable|facial|wellness spa)/i.test(
    value ?? "",
  );
}

/**
 * Resolve the active niche profile from the business/snapshot context.
 * We default to medspa today so the app ships with the intended experience,
 * while keeping the profile boundary explicit for future niches.
 */
export function resolveBusinessNicheProfile(input: {
  business?: Pick<Business, "industry" | "snapshotName"> | null;
  snapshotContext?: Pick<SnapshotContext, "snapshotName"> | null;
}): BusinessNicheProfile {
  const industrySlug = input.business?.industry?.slug;
  if (isMedspaProfileCandidate(industrySlug)) {
    return MEDSPA_BUSINESS_NICHE_PROFILE;
  }

  if (isMedspaProfileCandidate(input.business?.snapshotName)) {
    return MEDSPA_BUSINESS_NICHE_PROFILE;
  }

  if (isMedspaProfileCandidate(input.snapshotContext?.snapshotName)) {
    return MEDSPA_BUSINESS_NICHE_PROFILE;
  }

  return DEFAULT_BUSINESS_NICHE_PROFILE;
}
