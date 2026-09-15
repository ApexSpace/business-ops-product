import { PublicMembershipPurchase } from "@/features/memberships/components/public-membership-purchase";

export default async function PublicMembershipPlanPage({
  params,
}: {
  params: Promise<{ slug: string; planId: string }>;
}) {
  const { slug, planId } = await params;
  return <PublicMembershipPurchase slug={slug} planId={planId} />;
}
