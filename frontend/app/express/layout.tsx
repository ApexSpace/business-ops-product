import { PublicBookingLayout } from "@/components/layout/public-page-layout";

export default function ExpressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicBookingLayout>{children}</PublicBookingLayout>;
}
