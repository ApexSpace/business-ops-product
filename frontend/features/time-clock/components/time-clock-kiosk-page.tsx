"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ApiClientError } from "@/lib/api/errors";
import { ActionButton } from "@/components/ui/action-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/forms/drawer-sheet";
import { formatTimeInTimezone } from "@/features/calendars/utils/timezone";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import {
  clockInWithPin,
  clockOutWithPin,
  verifyTimeClockPin,
} from "@/features/time-clock/api/time-clock.api";
import type { VerifyPinResult } from "@/features/time-clock/types";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { cn } from "@/lib/utils";

type Screen = "pin" | "action" | "confirmation";

type ConfirmationState = {
  kind: "in" | "out";
  staffName: string;
  timeIso: string;
};

const KIOSK_CARD_CLASS =
  "w-full max-w-sm overflow-hidden border-border shadow-elevation-xs";

const KIOSK_HEADER_CLASS = "border-b border-border/60 px-6 pb-4 pt-6 text-center";

const KIOSK_CONTENT_CLASS = "space-y-4 px-6 py-6";

const KIOSK_FOOTER_CLASS =
  "justify-end gap-2.5 border-t border-border/70 bg-background px-6 py-4";

const KIOSK_PIN_INPUT_CLASS =
  "h-11 text-center text-lg tracking-[0.35em] tabular-nums";

export function TimeClockKioskPage() {
  const canManageTimeCards = useCan(PERMISSIONS["time-cards.manage"]);
  const { data: business } = useCurrentBusiness();
  const timezone = business?.timezone ?? "UTC";

  const [screen, setScreen] = useState<Screen>("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifyPinResult | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null,
  );

  const verifyMutation = useMutation({
    mutationFn: () => verifyTimeClockPin(pin),
    onSuccess: (data) => {
      setPinError(null);
      setVerified(data);
      setScreen("action");
    },
    onError: (err: Error) => {
      if (err instanceof ApiClientError && err.code === "TIMECLOCK_INVALID_PIN") {
        setPinError("Invalid PIN. Please try again.");
        return;
      }
      setPinError(err.message || "Invalid PIN. Please try again.");
    },
  });

  const clockInMutation = useMutation({
    mutationFn: () => clockInWithPin(pin),
    onSuccess: (data) => {
      setConfirmation({
        kind: "in",
        staffName: data.staffName,
        timeIso: data.clockInTime,
      });
      setScreen("confirmation");
    },
    onError: (err: Error) => {
      setPinError(err.message);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => clockOutWithPin(pin),
    onSuccess: (data) => {
      setConfirmation({
        kind: "out",
        staffName: data.staffName,
        timeIso: data.clockOutTime,
      });
      setScreen("confirmation");
    },
    onError: (err: Error) => {
      setPinError(err.message);
    },
  });

  const reset = () => {
    setScreen("pin");
    setPin("");
    setPinError(null);
    setVerified(null);
    setConfirmation(null);
  };

  const formatTime = (iso: string) =>
    formatTimeInTimezone(iso, timezone).toLowerCase();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-stretch gap-4">
        <Card className={KIOSK_CARD_CLASS}>
          <CardHeader className={KIOSK_HEADER_CLASS}>
            {screen === "pin" && (
              <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
                Clock In / Clock Out
              </CardTitle>
            )}
            {screen === "action" && verified && (
              <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
                Hello, {verified.staffName}!
              </CardTitle>
            )}
            {screen === "confirmation" && confirmation && (
              <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
                {confirmation.kind === "out"
                  ? `Thank you, ${confirmation.staffName}!`
                  : `Welcome, ${confirmation.staffName}!`}
              </CardTitle>
            )}
          </CardHeader>

          <CardContent className={KIOSK_CONTENT_CLASS}>
            {screen === "pin" && (
              <div className="space-y-2">
                <Input
                  value={pin}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(next);
                    setPinError(null);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      pin.length === 4 &&
                      !verifyMutation.isPending
                    ) {
                      verifyMutation.mutate();
                    }
                  }}
                  placeholder="Enter your PIN"
                  inputMode="numeric"
                  maxLength={4}
                  className={KIOSK_PIN_INPUT_CLASS}
                  autoComplete="off"
                  aria-invalid={!!pinError}
                />
                {pinError ? (
                  <p className="text-center text-sm text-destructive">{pinError}</p>
                ) : null}
              </div>
            )}

            {screen === "action" && verified && (
              <div className="space-y-2 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {verified.isCurrentlyClockedIn && verified.clockedInSince
                    ? `You're clocked in since ${formatTime(verified.clockedInSince)}.`
                    : "You're not clocked in."}
                </p>
                {pinError ? (
                  <p className="text-sm text-destructive">{pinError}</p>
                ) : null}
              </div>
            )}

            {screen === "confirmation" && confirmation && (
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                {confirmation.kind === "out"
                  ? `You're clocked out since ${formatTime(confirmation.timeIso)}.`
                  : `You're clocked in since ${formatTime(confirmation.timeIso)}.`}
              </p>
            )}
          </CardContent>

          <CardFooter className={KIOSK_FOOTER_CLASS}>
            {screen === "pin" && (
              <div className={cn(DRAWER_FOOTER_ACTIONS_CLASS, "sm:ml-0")}>
                <ActionButton
                  type="button"
                  disabled={pin.length !== 4 || verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate()}
                  className={DRAWER_FOOTER_BUTTON_CLASS}
                >
                  {verifyMutation.isPending ? "Checking…" : "Next"}
                </ActionButton>
              </div>
            )}

            {screen === "action" && verified && (
              <div className="flex w-full flex-wrap items-center justify-end gap-2.5">
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={reset}
                  className={cn(DRAWER_FOOTER_BUTTON_CLASS, "mr-auto")}
                >
                  Back
                </ActionButton>
                {verified.isCurrentlyClockedIn ? (
                  <ActionButton
                    type="button"
                    disabled={clockOutMutation.isPending}
                    onClick={() => {
                      setPinError(null);
                      clockOutMutation.mutate();
                    }}
                    className={DRAWER_FOOTER_BUTTON_CLASS}
                  >
                    {clockOutMutation.isPending ? "Clocking out…" : "Clock Out"}
                  </ActionButton>
                ) : (
                  <ActionButton
                    type="button"
                    disabled={clockInMutation.isPending}
                    onClick={() => {
                      setPinError(null);
                      clockInMutation.mutate();
                    }}
                    className={DRAWER_FOOTER_BUTTON_CLASS}
                  >
                    {clockInMutation.isPending ? "Clocking in…" : "Clock In"}
                  </ActionButton>
                )}
              </div>
            )}

            {screen === "confirmation" && (
              <div className={cn(DRAWER_FOOTER_ACTIONS_CLASS, "sm:ml-0")}>
                <ActionButton
                  type="button"
                  onClick={reset}
                  className={DRAWER_FOOTER_BUTTON_CLASS}
                >
                  Okay
                </ActionButton>
              </div>
            )}
          </CardFooter>
        </Card>

        {canManageTimeCards ? (
          <Link
            href="/business/time-cards"
            className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Manage Time Cards
          </Link>
        ) : null}
      </div>
    </div>
  );
}
