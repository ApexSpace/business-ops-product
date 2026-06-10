"use client";

import { useMemo, useState } from "react";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { ArrowRight, Building2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/provider";
import { useNavigationLoading } from "@/lib/runtime/navigation-loading";
import {
  contextKey,
  getContextRoleLabel,
  getContextShortLabel,
  getDashboardPath,
} from "@/lib/auth";
import { getAccessBlockedMessage } from "@/components/business-access/business-access-messages";
import { getSupportHref } from "@/lib/config/support";
import type { AuthContextItem } from "@/lib/types/shared";

function ContextCard({
  ctx,
  onSelect,
  loading,
}: {
  ctx: AuthContextItem;
  onSelect: () => void;
  loading: boolean;
}) {
  const Icon = ctx.type === "platform" ? Shield : Building2;
  const isDisabled =
    ctx.type === "business" && ctx.canAccessWorkspace === false;
  const blockedCopy =
    isDisabled && ctx.accessReasonCode
      ? getAccessBlockedMessage(ctx.accessReasonCode)
      : null;

  const handleClick = () => {
    if (isDisabled) {
      toast.error(blockedCopy?.message ?? "This workspace is not accessible.");
      return;
    }
    onSelect();
  };

  return (
    <Card
      className={cn(
        "transition-colors",
        isDisabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-primary",
      )}
    >
      <button
        type="button"
        className="w-full text-left disabled:cursor-not-allowed"
        onClick={handleClick}
        disabled={loading}
        aria-disabled={isDisabled}
      >
        <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3 space-y-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">
                {getContextShortLabel(ctx)}
              </CardTitle>
              {blockedCopy ? (
                <Badge variant="secondary">{blockedCopy.title}</Badge>
              ) : null}
            </div>
            <CardDescription className="truncate">
              {isDisabled
                ? blockedCopy?.message
                : getContextRoleLabel(ctx)}
            </CardDescription>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isDisabled ? null : (
              <ArrowRight className="size-4" />
            )}
          </div>
        </CardHeader>
      </button>
    </Card>
  );
}

function ContextSection({
  title,
  description,
  contexts,
  loadingKey,
  onSelect,
}: {
  title: string;
  description: string;
  contexts: AuthContextItem[];
  loadingKey: string | null;
  onSelect: (ctx: AuthContextItem) => void;
}) {
  if (contexts.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {contexts.map((ctx) => (
          <ContextCard
            key={contextKey(ctx)}
            ctx={ctx}
            loading={loadingKey === contextKey(ctx)}
            onSelect={() => onSelect(ctx)}
          />
        ))}
      </div>
    </section>
  );
}

export function SelectContextPage() {
  const router = useAppRouter();
  const { contexts, switchContext, user } = useAuth();
  const { stop } = useNavigationLoading();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const { platformContexts, businessContexts, accessibleBusinessCount } =
    useMemo(() => {
      const platform: AuthContextItem[] = [];
      const business: AuthContextItem[] = [];
      let accessible = 0;

      for (const ctx of contexts) {
        if (ctx.type === "platform") {
          platform.push(ctx);
        } else {
          business.push(ctx);
          if (ctx.canAccessWorkspace !== false) {
            accessible += 1;
          }
        }
      }

      return {
        platformContexts: platform,
        businessContexts: business,
        accessibleBusinessCount: accessible,
      };
    }, [contexts]);

  const handleSelect = async (ctx: AuthContextItem) => {
    if (ctx.type === "business" && ctx.canAccessWorkspace === false) {
      return;
    }

    setLoadingKey(contextKey(ctx));
    try {
      await switchContext(
        ctx.type,
        ctx.type === "business" ? ctx.businessId : undefined,
      );
      router.push(getDashboardPath(ctx.type));
      router.refresh();
    } catch (err) {
      stop();
      toast.error(err instanceof Error ? err.message : "Failed to switch");
    } finally {
      setLoadingKey(null);
    }
  };

  if (contexts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No access</CardTitle>
            <CardDescription>
              Your account is not linked to any platform or business.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const noAccessibleWorkspace =
    platformContexts.length === 0 && accessibleBusinessCount === 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Choose an account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email
            ? `Signed in as ${user.email}`
            : "Select where you want to work"}
        </p>
      </div>

      <div
        className={cn(
          "flex w-full max-w-2xl flex-col gap-8",
          platformContexts.length > 0 &&
            businessContexts.length > 0 &&
            "max-w-3xl",
        )}
      >
        {noAccessibleWorkspace ? (
          <Card className="border-destructive/30">
            <CardHeader className="space-y-3">
              <CardTitle>No accessible workspace</CardTitle>
              <CardDescription>
                None of your business workspaces are accessible right now. Review
                the reasons below or contact support for help.
              </CardDescription>
              <Button
                className="w-fit"
                nativeButton={false}
                render={<a href={getSupportHref()} />}
              >
                Contact support
              </Button>
            </CardHeader>
          </Card>
        ) : null}

        <ContextSection
          title="Platform"
          description="Manage the platform, businesses, and users."
          contexts={platformContexts}
          loadingKey={loadingKey}
          onSelect={handleSelect}
        />
        <ContextSection
          title="Businesses"
          description="Work inside a client business workspace."
          contexts={businessContexts}
          loadingKey={loadingKey}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
