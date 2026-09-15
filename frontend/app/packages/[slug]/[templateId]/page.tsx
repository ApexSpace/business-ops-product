import { PublicPackagePurchase } from "@/features/packages/components/public-package-purchase";

export default async function PublicPackagePage({
  params,
}: {
  params: Promise<{ slug: string; templateId: string }>;
}) {
  const { slug, templateId } = await params;
  return <PublicPackagePurchase slug={slug} templateId={templateId} />;
}
