"use client";

import { ChevronsUpDown, Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/provider";
import {
  contextKey,
  getContextRoleLabel,
  getContextShortLabel,
  getDashboardPath,
  isSameContext,
  resolveAuthContexts,
  shouldShowAccountSwitcher,
} from "@/lib/auth";
import type { AuthContextItem } from "@/lib/types/shared";
import { cn } from "@/lib/utils";

function ContextIcon({ ctx }: { ctx: AuthContextItem }) {
  if (ctx.type === "platform") {
    return <Shield className="size-3.5 shrink-0" />;
  }
  return <Building2 className="size-3.5 shrink-0" />;
}

const workspaceSwitcherSurfaceClassName =
  "glass-hover flex w-full items-center justify-between gap-2 rounded-2xl border border-white/12 bg-white/8 px-3 py-2 text-left text-[11px] font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden";

const workspaceSwitcherTriggerClassName = cn(
  workspaceSwitcherSurfaceClassName,
  "cursor-pointer transition-colors hover:border-white/22 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
);

interface WorkspaceSwitcherProps {
  workspaceName: string;
  className?: string;
}

export function WorkspaceSwitcher({
  workspaceName,
  className,
}: WorkspaceSwitcherProps) {
  const router = useAppRouter();
  const { contexts, jwt, user, switchContext } = useAuth();

  const effectiveContexts = resolveAuthContexts(contexts, jwt, user?.contexts);
  const canSwitch = shouldShowAccountSwitcher(contexts, jwt, user?.contexts);

  if (!canSwitch || effectiveContexts.length <= 1) {
    return (
      <div
        className={cn(workspaceSwitcherSurfaceClassName, "cursor-default", className)}
      >
        <span className="block truncate">{workspaceName}</span>
      </div>
    );
  }

  const platformContexts = effectiveContexts.filter((c) => c.type === "platform");
  const businessContexts = effectiveContexts.filter((c) => c.type === "business");

  const handleSelect = async (ctx: AuthContextItem) => {
    if (jwt && isSameContext(ctx, jwt)) return;
    try {
      await switchContext(
        ctx.type,
        ctx.type === "business" ? ctx.businessId : undefined,
      );
      router.push(getDashboardPath(ctx.type));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Switch failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(workspaceSwitcherTriggerClassName, className)}
      >
        <span className="truncate">{workspaceName}</span>
        <ChevronsUpDown className="size-3 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {platformContexts.length > 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Platform</DropdownMenuLabel>
            {platformContexts.map((ctx) => (
              <DropdownMenuItem
                key={contextKey(ctx)}
                onClick={() => void handleSelect(ctx)}
              >
                <ContextIcon ctx={ctx} />
                <div className="flex flex-col">
                  <span className="font-medium">{getContextShortLabel(ctx)}</span>
                  <span className="text-xs text-muted-foreground">
                    {getContextRoleLabel(ctx)}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
        {platformContexts.length > 0 && businessContexts.length > 0 ? (
          <DropdownMenuSeparator />
        ) : null}
        {businessContexts.length > 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Businesses</DropdownMenuLabel>
            {businessContexts.map((ctx) => (
              <DropdownMenuItem
                key={contextKey(ctx)}
                onClick={() => void handleSelect(ctx)}
              >
                <ContextIcon ctx={ctx} />
                <div className="flex flex-col">
                  <span className="font-medium">{getContextShortLabel(ctx)}</span>
                  <span className="text-xs text-muted-foreground">
                    {getContextRoleLabel(ctx)}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
