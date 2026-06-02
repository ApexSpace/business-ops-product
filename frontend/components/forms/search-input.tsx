"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  id,
}: SearchInputProps) {
  return (
    <div className={cn("relative max-w-sm", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-9"
      />
      {value ? (
        <IconButton
          aria-label="Clear search"
          className="absolute top-1/2 right-0.5 -translate-y-1/2"
          onClick={() => onChange("")}
        >
          <X className="size-4" />
        </IconButton>
      ) : null}
    </div>
  );
}
