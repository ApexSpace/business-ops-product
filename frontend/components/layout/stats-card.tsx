import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  label: string;
  value: number | string;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  className?: string;
}

export function StatsCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  comingSoon,
  className,
}: StatsCardProps) {
  const descriptionText =
    description ?? (comingSoon ? "Coming soon" : undefined);

  const content = (
    <div
      className={cn(
        "group relative flex h-full min-h-[7.25rem] flex-col rounded-lg bg-card p-4 shadow-elevation-xs ring-1 ring-border/70 transition-[box-shadow,ring-color] duration-150",
        href && "hover:shadow-elevation-sm hover:ring-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-muted-foreground" />
        ) : null}
      </div>
      <div className="mt-auto pt-3">
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        <p
          className={cn(
            "mt-1 min-h-[1.125rem] line-clamp-1 text-xs leading-[1.125rem] text-muted-foreground",
            !descriptionText && "invisible",
          )}
          aria-hidden={!descriptionText}
        >
          {descriptionText ?? "\u00a0"}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return content;
}
