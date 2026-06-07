import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageLayout>{children}</PublicPageLayout>;
}
