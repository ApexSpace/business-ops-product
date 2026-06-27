import { PublicMembershipsCatalog } from "@/features/memberships/components/public-memberships-catalog";

export default async function PublicMembershipsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicMembershipsCatalog slug={slug} />;
}
