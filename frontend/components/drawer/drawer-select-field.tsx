"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DrawerChevronIcon } from "@/components/drawer/drawer-icons";
import { DrawerFormFieldGroup } from "@/components/drawer/drawer-form-field-group";
import {
  DRAWER_SELECT_TRIGGER_CLASS,
  DRAWER_STACKED_FIELD_GROUP_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerSelectOption {
  value: string;
  label: string;
}

export interface DrawerSelectFieldProps {
  label: string;
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: DrawerSelectOption[];
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

/** Figma drawer select — label + 44px field + weui chevron, 75px field group. */
export function DrawerSelectField({
  label,
  id,
  value,
  onValueChange,
  placeholder,
  options,
  disabled = false,
  className,
  contentClassName,
}: DrawerSelectFieldProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DrawerFormFieldGroup
      label={label}
      htmlFor={id}
      className={cn(DRAWER_STACKED_FIELD_GROUP_CLASS, className)}
    >
      <Select
        value={value || undefined}
        onValueChange={(next) => onValueChange(next ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            DRAWER_SELECT_TRIGGER_CLASS,
            "flex w-full items-center gap-2 [&>svg]:hidden",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left text-[14px] font-normal leading-[18px]",
              selected ? "text-[#1A1A1A]" : "text-[#9A9A9A]",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <span className="inline-flex shrink-0" aria-hidden>
            <DrawerChevronIcon direction="down" />
          </span>
        </SelectTrigger>
        <SelectContent className={cn("max-h-60", contentClassName)}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DrawerFormFieldGroup>
  );
}
