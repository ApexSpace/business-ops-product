import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function EstimateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageLayout>{children}</PublicPageLayout>;
}
