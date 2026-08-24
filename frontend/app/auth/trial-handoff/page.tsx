import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { TrialHandoffClient } from "./trial-handoff-client";

export default function TrialHandoffPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<AuthStatus message="Signing you in…" />}>
        <TrialHandoffClient />
      </Suspense>
    </AuthLayout>
  );
}
