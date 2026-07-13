"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PhoneInput } from "@/components/forms/phone-input";
import { hasPhoneDigits } from "@/lib/forms/phone";
import { cn } from "@/lib/utils";

export interface BookingWaitlistFormValues {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  preferredMorning: boolean;
  preferredAfternoon: boolean;
  preferredEvening: boolean;
  comments: string;
}

interface BookingWaitlistFormProps {
  accentColor: string;
  serviceLabel?: string;
  staffLabel?: string;
  dateLabel?: string;
  onSubmit: (values: BookingWaitlistFormValues) => void;
  submitting?: boolean;
  compactTrigger?: boolean;
  onOpenForm?: () => void;
  className?: string;
}

export function BookingWaitlistForm({
  accentColor,
  serviceLabel,
  staffLabel,
  dateLabel,
  onSubmit,
  submitting = false,
  compactTrigger = false,
  onOpenForm,
  className,
}: BookingWaitlistFormProps) {
  const [expanded, setExpanded] = useState(!compactTrigger);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [preferredMorning, setPreferredMorning] = useState(false);
  const [preferredAfternoon, setPreferredAfternoon] = useState(false);
  const [preferredEvening, setPreferredEvening] = useState(false);
  const [comments, setComments] = useState("");

  const canSubmit =
    customerFirstName.trim().length > 0 &&
    customerLastName.trim().length > 0 &&
    hasPhoneDigits(customerPhone);

  if (compactTrigger && !expanded) {
    return (
      <div className={cn("border-t px-4 py-4 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          Not seeing a time that works for you?
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => {
            setExpanded(true);
            onOpenForm?.();
          }}
        >
          Join our waitlist
        </Button>
      </div>
    );
  }

  return (
    <form
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          customerFirstName,
          customerLastName,
          customerEmail,
          customerPhone,
          preferredMorning,
          preferredAfternoon,
          preferredEvening,
          comments,
        });
      }}
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {dateLabel ? (
          <p className="text-sm font-medium">Waitlist for {dateLabel}</p>
        ) : (
          <p className="text-sm font-medium">Join the waitlist</p>
        )}
        {serviceLabel ? (
          <p className="text-sm text-muted-foreground">
            {serviceLabel}
            {staffLabel ? ` with ${staffLabel}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            We will contact you when a slot opens.
          </p>
        )}

        <div className="space-y-1.5">
          <Label>Phone *</Label>
          <PhoneInput
            value={customerPhone || null}
            onChange={(v) => setCustomerPhone(v ?? "")}
            showClear={false}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First name *</Label>
            <Input
              value={customerFirstName}
              onChange={(e) => setCustomerFirstName(e.target.value)}
              placeholder="Enter first name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Last name *</Label>
            <Input
              value={customerLastName}
              onChange={(e) => setCustomerLastName(e.target.value)}
              placeholder="Enter last name"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="space-y-2">
          <Label>What times are you available?</Label>
          <div className="space-y-2 rounded-lg border bg-background p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Morning (before 12pm)</span>
              <Switch
                checked={preferredMorning}
                onCheckedChange={setPreferredMorning}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Afternoon (12pm - 5pm)</span>
              <Switch
                checked={preferredAfternoon}
                onCheckedChange={setPreferredAfternoon}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Evening (after 5pm)</span>
              <Switch
                checked={preferredEvening}
                onCheckedChange={setPreferredEvening}
              />
            </label>
          </div>
        </div>

        <div className="space-y-1.5 pb-2">
          <Label>
            If there are other dates that work or special requests, leave a
            comment
          </Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter any comments"
            rows={3}
          />
        </div>
      </div>

      <div className="shrink-0 border-t bg-card p-4">
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          style={{ backgroundColor: accentColor }}
          className="h-11 w-full text-base font-semibold text-white hover:opacity-90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Joining…
            </>
          ) : (
            "Join Waitlist"
          )}
        </Button>
      </div>
    </form>
  );
}
