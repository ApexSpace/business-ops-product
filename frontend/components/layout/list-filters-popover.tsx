"use client";



import { SlidersHorizontal } from "lucide-react";

import {

  Popover,

  PopoverContent,

  PopoverTrigger,

} from "@/components/ui/popover";

import { DATA_TABLE_FILTER_ICON_CLASS } from "@/lib/design/data-table-tokens";

import { cn } from "@/lib/utils";



export interface ListFilterOption {

  value: string;

  label: string;

}



interface ListFiltersPopoverProps {

  options: ListFilterOption[];

  value: string;

  onValueChange: (value: string) => void;

  /** Shown above the option list */

  label?: string;

  className?: string;

}



/**

 * Figma list filter — sliders icon beside search; options open in a popover.

 */

export function ListFiltersPopover({

  options,

  value,

  onValueChange,

  label = "Status",

  className,

}: ListFiltersPopoverProps) {

  const isActive = value !== "all" && value !== "";



  return (

    <Popover>

      <PopoverTrigger

        render={

          <button

            type="button"

            aria-label={isActive ? `Filters, ${label} active` : "Filters"}

            className={cn(DATA_TABLE_FILTER_ICON_CLASS, "relative", className)}

          >

            <SlidersHorizontal

              className="size-5 shrink-0 text-black"

              strokeWidth={2}

            />

            <span className="sr-only">Filter</span>

            {isActive ? (

              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#7E3BED]" />

            ) : null}

          </button>

        }

      />

      <PopoverContent align="end" className="w-56 space-y-2 p-3">

        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">

          {label}

        </p>

        <div className="flex flex-col gap-0.5">

          {options.map((opt) => {

            const active = value === opt.value;

            return (

              <button

                key={opt.value}

                type="button"

                className={cn(

                  "rounded-md px-2 py-1.5 text-left text-sm text-[#4A4A4A] hover:bg-muted",

                  active && "bg-muted font-semibold text-[#5F2CB2]",

                )}

                onClick={() => onValueChange(opt.value)}

              >

                {opt.label}

              </button>

            );

          })}

        </div>

      </PopoverContent>

    </Popover>

  );

}


