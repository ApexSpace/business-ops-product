"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PublicBookingCatalogCategory,
  PublicBookingCatalogService,
  PublicBookingServiceLineSelection,
} from "@/features/public-booking/schemas/public-booking";
import { BookingServiceCatalog } from "@/features/public-booking/components/booking-service-catalog";
import type { PublicBookingBusiness } from "@/features/public-booking/schemas/public-booking";

interface BookingServiceCartProps {
  business: PublicBookingBusiness;
  lines: PublicBookingServiceLineSelection[];
  categories?: PublicBookingCatalogCategory[];
  catalogLoading?: boolean;
  accentColor: string;
  allowMultipleServices: boolean;
  onBack: () => void;
  onRemoveLine: (index: number) => void;
  onAddAnother: () => void;
  onSelectAdditionalService?: (service: PublicBookingCatalogService) => void;
  onContinue: () => void;
}

export function BookingServiceCart({
  business,
  lines,
  categories = [],
  catalogLoading = false,
  accentColor,
  allowMultipleServices,
  onBack,
  onRemoveLine,
  onAddAnother,
  onSelectAdditionalService,
  onContinue,
}: BookingServiceCartProps) {
  const heading = lines.length === 1 ? "Your service" : "Your services";

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 size-4" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">/</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          Service
        </span>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose another service below, or continue to pick a date and time.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onContinue}>
            Next
          </Button>
        </div>

        <div className="divide-y rounded-lg border">
          {lines.map((line, index) => (
            <div
              key={`${line.service.id}-${index}`}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium">{line.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  with {line.staff.name}
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-orange-600 hover:underline"
                onClick={() => onRemoveLine(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {allowMultipleServices ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="font-medium">Do you want to add another service?</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={onAddAnother}>
                Yes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onContinue}
                className={cn("border-foreground/20")}
              >
                No
              </Button>
            </div>
          </div>
        ) : null}

        {allowMultipleServices &&
        categories.length > 0 &&
        onSelectAdditionalService ? (
          <div className="overflow-hidden rounded-lg border">
            <BookingServiceCatalog
              business={business}
              categories={categories}
              accentColor={accentColor}
              loading={catalogLoading}
              onSelectService={onSelectAdditionalService}
              compact
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
