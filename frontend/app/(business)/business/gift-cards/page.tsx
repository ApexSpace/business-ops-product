import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { GiftCardsWorkspace } from "@/features/gift-cards/components/gift-cards-workspace";

export default function GiftCardsPage() {
  return (
    <PageContainer>
      <PageHeader title="Gift Cards" description="Manage prepaid gift cards and balances." />
      <GiftCardsWorkspace />
    </PageContainer>
  );
}
