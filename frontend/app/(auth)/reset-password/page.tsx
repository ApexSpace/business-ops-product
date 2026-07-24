import type { Metadata } from "next";
import { Suspense } from "react";
import { DarkModeToggle } from "@/components/theme/dark-mode-toggle";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
