import type { Metadata } from "next";
import { PublicEstimateUnavailablePage } from "@/features/estimates/components/public-estimate-unavailable-page";
import { PUBLIC_ESTIMATE_UNAVAILABLE_TITLE } from "@/features/estimates/public-estimate-launch";

export const metadata: Metadata = {
  title: PUBLIC_ESTIMATE_UNAVAILABLE_TITLE,
};

/**
 * C-P0-01 waived for launch: there is no public estimate API.
 * Keep this route public so leftover links show an unavailable state
 * instead of a fake “not found” product page or a login redirect.
 */
export default function PublicEstimatePage() {
  return <PublicEstimateUnavailablePage />;
}
