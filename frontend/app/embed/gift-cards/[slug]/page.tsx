"use client";

import { use } from "react";
import { PublicGiftCardPurchase } from "@/features/gift-cards/components/public-gift-card-purchase";

export default function EmbedGiftCardsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <div className="min-h-0 bg-transparent">
      <PublicGiftCardPurchase slug={slug} embed />
    </div>
  );
}
