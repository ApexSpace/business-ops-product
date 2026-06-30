"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ApiClientError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatTimeInTimezone } from "@/features/calendars/utils/timezone";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import {
  clockInWithPin,
  clockOutWithPin,
  verifyTimeClockPin,
} from "@/features/time-clock/api/time-clock.api";
import type { VerifyPinResult } from "@/features/time-clock/types";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";

type Screen = "pin" | "action" | "confirmation";

type ConfirmationState = {
  kind: "in" | "out";
  staffName: string;
  timeIso: string;
};

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
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            {screen === "pin" && (
              <CardTitle className="text-xl font-semibold">
                Clock In / Clock Out
              </CardTitle>
            )}
            {screen === "action" && verified && (
              <CardTitle className="text-xl font-semibold">
                Hello, {verified.staffName}!
              </CardTitle>
            )}
            {screen === "confirmation" && confirmation && (
              <CardTitle className="text-xl font-semibold">
                {confirmation.kind === "out"
                  ? `Thank you, ${confirmation.staffName}!`
                  : `Welcome, ${confirmation.staffName}!`}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {screen === "pin" && (
              <>
                <Input
                  value={pin}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(next);
                    setPinError(null);
                  }}
                  placeholder="Enter your PIN"
                  inputMode="numeric"
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                  autoComplete="off"
                />
                {pinError ? (
                  <p className="text-center text-sm text-destructive">{pinError}</p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={pin.length !== 4 || verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate()}
                >
                  Next
                </Button>
              </>
            )}

            {screen === "action" && verified && (
              <>
                <p className="text-center text-muted-foreground">
                  {verified.isCurrentlyClockedIn && verified.clockedInSince
                    ? `You're clocked in since ${formatTime(verified.clockedInSince)}.`
                    : "You're not clocked in."}
                </p>
                {pinError ? (
                  <p className="text-center text-sm text-destructive">{pinError}</p>
                ) : null}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={reset}>
                    Back
                  </Button>
                  {verified.isCurrentlyClockedIn ? (
                    <Button
                      className="flex-1"
                      disabled={clockOutMutation.isPending}
                      onClick={() => {
                        setPinError(null);
                        clockOutMutation.mutate();
                      }}
                    >
                      Clock Out
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      disabled={clockInMutation.isPending}
                      onClick={() => {
                        setPinError(null);
                        clockInMutation.mutate();
                      }}
                    >
                      Clock In
                    </Button>
                  )}
                </div>
              </>
            )}

            {screen === "confirmation" && confirmation && (
              <>
                <p className="text-center text-muted-foreground">
                  {confirmation.kind === "out"
                    ? `You're clocked out since ${formatTime(confirmation.timeIso)}.`
                    : `You're clocked in since ${formatTime(confirmation.timeIso)}.`}
                </p>
                <Button className="w-full" onClick={reset}>
                  Okay
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {canManageTimeCards ? (
          <Link
            href="/business/time-cards"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Manage Time Cards
          </Link>
        ) : null}
      </div>
    </div>
  );
}
