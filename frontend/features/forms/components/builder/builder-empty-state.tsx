"use client";

import { cn } from "@/lib/utils";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_GROUP_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import { FORMS_BUILDER_EMPTY_CLASS } from "@/lib/design/forms-builder-tokens";

export function BuilderEmptyState() {
  return (
    <div className={FORMS_BUILDER_EMPTY_CLASS}>
      <p className={SETTINGS_GROUP_TITLE_CLASS}>Your form is empty</p>
      <p className={cn("mt-2 max-w-sm", SETTINGS_FORM_DESCRIPTION_CLASS)}>
        Add fields from the palette on the left to start building your lead
        capture form.
      </p>
    </div>
  );
}
