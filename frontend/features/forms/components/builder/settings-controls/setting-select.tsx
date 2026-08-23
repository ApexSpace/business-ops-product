"use client";

import { Check } from "lucide-react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SettingSelectOption {
  value: string;
  label: string;
}

interface SettingSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SettingSelectOption[];
  placeholder?: string;
  className?: string;
}

const triggerClassName =
  "flex h-[var(--control-height)] w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-input bg-transparent px-3 text-sm transition-[border-color,box-shadow,background-color] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/20 dark:hover:bg-input/30";

export function SettingSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
}: SettingSelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <button type="button" className={cn(triggerClassName, className)}>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                !selected && "text-muted-foreground",
              )}
            >
              {selected?.label ?? placeholder}
            </span>
            <NavArrowIcon direction="down" size="lg" className="text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent
        align="start"
        className="z-[200] w-(--anchor-width) min-w-0"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (next != null) onChange(String(next));
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
