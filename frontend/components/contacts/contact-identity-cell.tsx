"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getContactInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export interface ContactIdentityCellProps {
  contactId: string;
  label: string;
  avatarUrl?: string | null;
  className?: string;
}

export function ContactIdentityCell({
  contactId,
  label,
  avatarUrl,
  className,
}: ContactIdentityCellProps) {
  return (
    <div
      className={cn("flex min-w-0 max-w-[260px] items-center gap-2", className)}
    >
      <Avatar size="sm" className="overflow-hidden bg-muted/40 p-0.5">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="" className="rounded-full" />
        ) : null}
        <AvatarFallback className="size-full rounded-full bg-muted/80 text-[10px] font-medium leading-none text-muted-foreground">
          {getContactInitials(label)}
        </AvatarFallback>
      </Avatar>
      <Link
        href={`/business/contacts/${contactId}`}
        className="truncate text-sm font-normal leading-snug text-foreground transition-colors hover:text-primary hover:underline"
      >
        {label}
      </Link>
    </div>
  );
}
