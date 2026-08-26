"use client";

import { ActionButton } from "@/components/ui/action-button";

interface FormsListHeaderActionsProps {
  onCreate: () => void;
}

export function FormsListHeaderActions({ onCreate }: FormsListHeaderActionsProps) {
  return (
    <ActionButton onClick={onCreate}>
      Create form
    </ActionButton>
  );
}
