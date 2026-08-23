import Link from "next/link";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardShellProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function DashboardCardShell({
  title,
  description,
  actionLabel,
  actionHref,
  action,
  className,
  contentClassName,
  children,
}: DashboardCardShellProps) {
  return (
    <Card
      className={cn(
        "rounded-[var(--radius-2xl)] border-[#d8e5ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(240,246,255,0.98))] p-0 shadow-[0_20px_44px_-28px_rgba(55,91,210,0.28)] dark:border-[#243a73] dark:bg-[linear-gradient(180deg,rgba(11,21,48,0.88),rgba(18,34,72,0.95))]",
        className,
      )}
      tone="glass"
    >
      <CardHeader className="border-b border-border/60 pb-3">
        <div>
          <CardTitle className="text-[10.5px] font-semibold tracking-[0.08em] text-[#98a1b5] uppercase">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="mt-1 text-[11px]">{description}</CardDescription>
          ) : null}
        </div>
        {action ? (
          <CardAction>{action}</CardAction>
        ) : actionHref && actionLabel ? (
          <CardAction>
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {actionLabel}
              <NavArrowIcon direction="right" size={14} />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={cn("p-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
