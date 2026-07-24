import { PlatformOperationsPage } from "@/features/platform/pages/platform-operations-page";
import type { CampaignType } from "@/features/platform/api/operations.api";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab as CampaignType | "ALL" | undefined;
  return (
    <PlatformOperationsPage
      initialCampaignId={params.campaignId}
      initialTab={tab}
    />
  );
}
