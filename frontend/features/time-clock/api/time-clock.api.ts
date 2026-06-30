import { api } from "@/lib/api/client";
import type {
  ClockInResult,
  ClockOutResult,
  VerifyPinResult,
} from "@/features/time-clock/types";

export function verifyTimeClockPin(pin: string) {
  return api.post<VerifyPinResult>("time-clock/verify-pin", { pin });
}

export function clockInWithPin(pin: string) {
  return api.post<ClockInResult>("time-clock/clock-in", { pin });
}

export function clockOutWithPin(pin: string) {
  return api.post<ClockOutResult>("time-clock/clock-out", { pin });
}
