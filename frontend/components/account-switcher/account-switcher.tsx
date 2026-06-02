"use client";

import { useAppRouter } from "@/hooks/use-app-router";
import { ChevronsUpDown, Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-provider";
import {
  contextKey,
  getContextRoleLabel,
  getContextShortLabel,
  getDashboardPath,
  isSameContext,
} from "@/lib/auth";
import type { AuthContextItem } from "@/types/api";

function ContextIcon({ ctx }: { ctx: AuthContextItem }) {
  if (ctx.type === "platform") {
    return <Shield className="size-4" />;
  }
  return <Building2 className="size-4" />;
}

function ContextMenuItem({
  ctx,
  activeItem,
  onSelect,
}: {
  ctx: AuthContextItem;
  activeItem: boolean;
  onSelect: (ctx: AuthContextItem) => void;
}) {
  return (
    <DropdownMenuItem
      onClick={() => onSelect(ctx)}
      className={activeItem ? "bg-accent" : undefined}
    >
      <div className="flex items-start gap-2">
        <ContextIcon ctx={ctx} />
        <div className="flex flex-col">
          <span className="font-medium">{getContextShortLabel(ctx)}</span>
          <span className="text-xs text-muted-foreground">
            {getContextRoleLabel(ctx)}
          </span>
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export function AccountSwitcher() {
  const router = useAppRouter();
  const { contexts, jwt, switchContext } = useAuth();

  if (contexts.length === 0) return null;

  const platformContexts = contexts.filter((c) => c.type === "platform");
  const businessContexts = contexts.filter((c) => c.type === "business");

  const active =
    contexts.find((c) => jwt && isSameContext(c, jwt)) ?? contexts[0];

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
        render={
          <Button
            variant="outline"
            className="h-9 max-w-[240px] justify-between gap-2 px-3"
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <ContextIcon ctx={active} />
          <span className="truncate text-sm font-medium">
            {getContextShortLabel(active)}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(24rem,70vh)] w-72 overflow-y-auto">
        {platformContexts.length > 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Platform</DropdownMenuLabel>
            {platformContexts.map((ctx) => (
              <ContextMenuItem
                key={contextKey(ctx)}
                ctx={ctx}
                activeItem={jwt ? isSameContext(ctx, jwt) : false}
                onSelect={handleSelect}
              />
            ))}
          </DropdownMenuGroup>
        ) : null}

        {platformContexts.length > 0 && businessContexts.length > 0 ? (
          <DropdownMenuSeparator />
        ) : null}

        {businessContexts.length > 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              Businesses ({businessContexts.length})
            </DropdownMenuLabel>
            {businessContexts.map((ctx) => (
              <ContextMenuItem
                key={contextKey(ctx)}
                ctx={ctx}
                activeItem={jwt ? isSameContext(ctx, jwt) : false}
                onSelect={handleSelect}
              />
            ))}
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
