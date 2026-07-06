"use client";

import Link from "next/link";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";

export interface ContactIdentityCellProps {
  contactId: string;
  label: string;
  avatarUrl?: string | null;
  className?: string;
  href?: string;
  onSelect?: () => void;
  isActive?: boolean;
}

export function ContactIdentityCell({
  contactId,
  label,
  avatarUrl,
  className,
  href = `/business/contacts/${contactId}`,
  onSelect,
  isActive = false,
}: ContactIdentityCellProps) {
  return (
    <div
      className={cn("flex min-w-0 max-w-[260px] items-center gap-2", className)}
    >
      <ProfileAvatar
        name={label}
        avatarUrl={avatarUrl}
        size="sm"
        className="overflow-hidden bg-muted/40 p-0.5"
        fallbackClassName="size-full rounded-full bg-muted/80 text-[10px] font-medium leading-none text-muted-foreground"
      />
      <Link
        href={href}
        onClick={(event) => {
          if (!onSelect) return;
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          event.preventDefault();
          onSelect();
        }}
        className={cn(
          "truncate text-sm font-normal leading-snug transition-colors hover:text-primary hover:underline",
          isActive ? "text-primary" : "text-foreground",
        )}
      >
        {label}
      </Link>
    </div>
  );
}
