import { Suspense } from "react";
import { DarkModeToggle } from "@/components/theme/dark-mode-toggle";
import { AcceptInviteForm } from "./accept-invite-form";

export default function AcceptInvitePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <Suspense fallback={null}>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}
