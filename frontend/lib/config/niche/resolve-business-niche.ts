import type { SnapshotContext } from "@/features/platform/types/snapshot";
import type { Business } from "@/lib/types/api";
import { MEDSPA_BUSINESS_NICHE_PROFILE } from "./profiles";
import type { BusinessNicheProfile } from "./types";

/**
 * MedSpa-only product: always resolve the MedSpa niche profile.
 */
export function resolveBusinessNicheProfile(_input: {
  business?: Pick<Business, "industry" | "snapshotName"> | null;
  snapshotContext?: Pick<SnapshotContext, "snapshotName"> | null;
}): BusinessNicheProfile {
  return MEDSPA_BUSINESS_NICHE_PROFILE;
}
