import { cn } from "@/lib/utils";
import {
  SETTINGS_FORM_FIELDS_CLASS,
  SETTINGS_FORM_GRID_CLASS,
  SETTINGS_FORM_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";

export function SettingsFormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        SETTINGS_FORM_FIELDS_CLASS,
        SETTINGS_FORM_GRID_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Vertical settings form body — field spacing + stack rhythm. */
export function SettingsFormStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        SETTINGS_FORM_FIELDS_CLASS,
        SETTINGS_FORM_STACK_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}
