"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  DATA_TABLE_CELL_CLASS,
  DATA_TABLE_HEAD_CELL_CLASS,
  DATA_TABLE_ROW_CLASS,
} from "@/lib/design/data-table-tokens"

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  /** Defaults to overflow-x-auto; pass "" / overflow-visible when a parent owns scrolling (sticky headers). */
  containerClassName?: string;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full",
        containerClassName ?? "overflow-x-auto",
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b-0", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-b-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-[#BC9BF6] bg-[#F3F0F9] font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(DATA_TABLE_ROW_CLASS, className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        DATA_TABLE_HEAD_CELL_CLASS,
        "[&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-3",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        DATA_TABLE_CELL_CLASS,
        "[&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-3",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
