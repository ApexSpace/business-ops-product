"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { PhoneInput } from "@/components/forms/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasPhoneDigits } from "@/lib/forms/phone";
import type { PublicBookingCalendar } from "@/features/public-booking/schemas/public-booking";

interface BookingDetailsFormProps {
  calendar: PublicBookingCalendar;
  accentColor: string;
  summary: { dateLabel: string; timeLabel: string; durationLabel: string };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  submitting: boolean;
  submitError: boolean;
  onBack: () => void;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}

export function BookingDetailsForm({
  calendar,
  accentColor,
  summary,
  customerName,
  customerEmail,
  customerPhone,
  notes,
  submitting,
  submitError,
  onBack,
  onChange,
  onSubmit,
  compact = false,
}: BookingDetailsFormProps) {
  const fs = calendar.formSettings;
  const canSubmit =
    customerName.trim().length > 0 &&
    (!fs.requireEmail || customerEmail.trim().length > 0) &&
    (!fs.requirePhone || hasPhoneDigits(customerPhone));

  const scheduleLabel = calendar.buttonText || "Book now";

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        compact
          ? "min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3"
          : "p-4 sm:p-6 lg:p-8",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "-ml-2 h-9 w-fit",
          compact ? "mb-1.5" : "mb-3",
        )}
        onClick={onBack}
      >
        <ChevronLeft className="mr-1 size-4" />
        Back
      </Button>

      <div className={cn(!compact && "space-y-6")}>
        {!compact ? (
          <div className="mb-6 rounded-lg border bg-muted/30 px-4 py-3.5 text-sm lg:hidden">
            <p className="font-medium">{summary.dateLabel}</p>
            <p className="mt-1 text-muted-foreground">
              {summary.timeLabel} · {summary.durationLabel}
            </p>
          </div>
        ) : null}

        <div className={cn(compact ? "mb-3 space-y-0.5" : "space-y-1.5")}>
          <h2 className="text-lg font-semibold">Enter your details</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll send your confirmation to the email you provide.
          </p>
        </div>

        <form
          className={cn(compact ? "space-y-4" : "space-y-5")}
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pb-name">Name *</Label>
            <Input
              id="pb-name"
              value={customerName}
              onChange={(e) => onChange("customerName", e.target.value)}
              className="h-11 text-base sm:text-sm"
              autoComplete="name"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb-email">
              Email{fs.requireEmail ? " *" : ""}
            </Label>
            <Input
              id="pb-email"
              type="email"
              inputMode="email"
              value={customerEmail}
              onChange={(e) => onChange("customerEmail", e.target.value)}
              className="h-11 text-base sm:text-sm"
              autoComplete="email"
              required={fs.requireEmail}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb-phone">
              Phone{fs.requirePhone ? " *" : ""}
            </Label>
            <PhoneInput
              id="pb-phone"
              value={customerPhone || null}
              onChange={(value) => onChange("customerPhone", value ?? "")}
              className="h-11 sm:h-[var(--control-height)]"
              showClear={false}
            />
          </div>

          {fs.showNotes ? (
            <div className="space-y-1.5">
              <Label htmlFor="pb-notes">Notes</Label>
              <Textarea
                id="pb-notes"
                rows={3}
                value={notes}
                onChange={(e) => onChange("notes", e.target.value)}
                className="min-h-[80px] text-base sm:text-sm"
                placeholder="Anything we should know?"
              />
            </div>
          ) : null}

          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              This time may no longer be available. Go back and choose another
              slot.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit || submitting}
            className="h-11 w-full text-base font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Scheduling…
              </>
            ) : (
              scheduleLabel
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
