"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ContactWorkspaceShell } from "@/features/contacts/components/contact-workspace/contact-workspace-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppRouter } from "@/lib/hooks/use-app-router";

export default function ContactWorkspacePage() {
  const router = useAppRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("contact", id);
    if (!next.get("tab")) {
      next.set("tab", "timeline");
    }
    router.replace(`/business/contacts?${next.toString()}`, { scroll: false });
  }, [id, router, searchParams]);

  return (
    <ContactWorkspaceShell>
      <Skeleton className="m-4 h-full rounded-2xl" />
    </ContactWorkspaceShell>
  );
}
