import { PublicPackagesCatalog } from "@/features/packages/components/public-packages-catalog";

export default async function PublicPackagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicPackagesCatalog slug={slug} />;
}
