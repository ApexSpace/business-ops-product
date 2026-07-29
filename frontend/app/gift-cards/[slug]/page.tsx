"use client";

import { use } from "react";
import { PublicGiftCardPurchase } from "@/features/gift-cards/components/public-gift-card-purchase";

export default function PublicGiftCardsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <div className="min-h-svh bg-muted/30">
      <PublicGiftCardPurchase slug={slug} />
    </div>
  );
}
