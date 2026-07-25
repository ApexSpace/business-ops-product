import { Suspense } from "react";
import { TrialHandoffClient } from "./trial-handoff-client";

export default function TrialHandoffPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        }
      >
        <TrialHandoffClient />
      </Suspense>
    </div>
  );
}
