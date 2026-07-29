"use client";

import { ChevronRight, Gift, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PublicBookingBusiness,
  PublicBookingCatalogCategory,
  PublicBookingCatalogService,
} from "@/features/public-booking/schemas/public-booking";

interface BookingServiceCatalogProps {
  business: PublicBookingBusiness;
  categories: PublicBookingCatalogCategory[];
  accentColor: string;
  loading?: boolean;
  compact?: boolean;
  onSelectService: (service: PublicBookingCatalogService) => void;
}

export function BookingServiceCatalog({
  business,
  categories,
  accentColor,
  loading = false,
  compact = false,
  onSelectService,
}: BookingServiceCatalogProps) {
  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Loading services…
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {!compact ? (
        <div className="border-b px-4 py-4 sm:px-6">
          <p className="text-sm font-semibold">{business.businessName}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Select a service
          </h1>
        </div>
      ) : (
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Add another service</p>
        </div>
      )}

      <div className="divide-y">
        {categories.map((category) => (
          <div key={category.id}>
            <div
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide sm:px-6"
              style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
            >
              {category.name}
            </div>
            {category.services.map((service) => (
              <button
                key={service.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 sm:px-6"
                onClick={() => onSelectService(service)}
              >
                <span className="font-medium">{service.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  {service.price ? `$${service.price}` : null}
                  <ChevronRight className="size-4" />
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {(business.giftCardUrl || business.packageUrl) && (
        <div className="space-y-2 border-t p-4 sm:p-6">
          {business.giftCardUrl ? (
            <a
              href={business.giftCardUrl}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/30",
              )}
            >
              <Gift className="size-4 text-muted-foreground" />
              Buy a gift card
            </a>
          ) : null}
          {business.packageUrl ? (
            <a
              href={business.packageUrl}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/30"
            >
              <Layers className="size-4 text-muted-foreground" />
              Buy a package
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
