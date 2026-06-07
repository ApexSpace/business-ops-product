import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <PublicPageLayout>{children}</PublicPageLayout>;
}
