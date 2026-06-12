"use client";

import { Plus } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";

interface FormsListHeaderActionsProps {
  onCreate: () => void;
}

export function FormsListHeaderActions({ onCreate }: FormsListHeaderActionsProps) {
  return (
    <ActionButton onClick={onCreate}>
      <Plus className="mr-2 size-4" />
      Create form
    </ActionButton>
  );
}
