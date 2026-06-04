"use client";

import { Suspense } from "react";
import { ContactWorkspaceShell } from "@/features/contacts/components/contact-workspace/contact-workspace-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactWorkspacePageContent } from "@/features/contacts/workspace/contact-workspace-page";

export default function ContactWorkspacePage() {
  return (
    <Suspense
      fallback={
        <ContactWorkspaceShell>
          <Skeleton className="m-4 h-full rounded-2xl" />
        </ContactWorkspaceShell>
      }
    >
      <ContactWorkspacePageContent />
    </Suspense>
  );
}
