"use client";

import { useParams } from "next/navigation";
import { ContactWorkspaceView } from "@/features/contacts/workspace/contact-workspace-view";
import { useContactWorkspace } from "@/features/contacts/workspace/use-contact-workspace";

export function ContactWorkspacePageContent() {
  const { id } = useParams<{ id: string }>();
  const state = useContactWorkspace(id);
  return <ContactWorkspaceView {...state} />;
}
