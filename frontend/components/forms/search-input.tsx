"use client";



import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

import { IconButton } from "@/components/ui/icon-button";

import { cn } from "@/lib/utils";

import { DATA_TABLE_SEARCH_STANDALONE_CLASS } from "@/lib/design/data-table-tokens";



export interface SearchInputProps {

  value: string;

  onChange: (value: string) => void;

  placeholder?: string;

  className?: string;

  id?: string;

}



/** Figma list search — h 44, radius/md. ListToolbar strips the border when paired with a filter icon. */

export function SearchInput({

  value,

  onChange,

  placeholder = "Search",

  className,

  id,

}: SearchInputProps) {

  return (

    <div

      data-slot="search-input"

      className={cn("relative w-full min-w-0 max-w-[min(100%,355px)]", className)}

    >

      <Search

        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-grey-tertiary-normal"

        aria-hidden

      />

      <Input

        id={id}

        type="search"

        value={value}

        onChange={(e) => onChange(e.target.value)}

        placeholder={placeholder}

        className={cn(DATA_TABLE_SEARCH_STANDALONE_CLASS, "pl-10 pr-9")}

      />

      {value ? (

        <IconButton

          aria-label="Clear search"

          className="absolute top-1/2 right-1 -translate-y-1/2 !border-0 !bg-transparent shadow-none"

          onClick={() => onChange("")}

        >

          <X className="size-4" />

        </IconButton>

      ) : null}

    </div>

  );

}


