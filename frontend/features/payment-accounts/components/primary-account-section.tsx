"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/data-display/loading-state";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";
import { useAuth } from "@/lib/auth/provider";
import {
  createStripeDashboardLink,
  createStripeOnboardingLink,
  updatePaymentsMode,
} from "@/features/payment-accounts/api/payment-accounts.api";
import { usePrimaryPaymentAccount } from "@/features/payment-accounts/hooks/use-primary-payment-account";
import { OAuthPopupBlockedDialog } from "@/features/integrations/components/oauth-popup-blocked-dialog";
import {
  getOAuthStartUrl,
  hasOAuthStartRoute,
} from "@/features/integrations/utils/integrations";
import { openOAuthPopup } from "@/features/integrations/utils/oauth-popup";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

export function PrimaryAccountSection() {
  const queryClient = useQueryClient();
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const staffPermissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const canManage = useCan(PERMISSIONS["settings.business"]);
  const canViewTransactions =
    isAdmin ||
    hasStaffPermission(staffPermissions, "payments.access", role);
  const { data, isLoading, isError, error, refetch } = usePrimaryPaymentAccount();
  const [connecting, setConnecting] = useState(false);
  const [popupBlockedOpen, setPopupBlockedOpen] = useState(false);
  const [blockedOAuthUrl, setBlockedOAuthUrl] = useState("");

  const linkMutation = useMutation({
    mutationFn: async (type: "onboarding" | "dashboard") => {
      const result =
        type === "onboarding"
          ? await createStripeOnboardingLink()
          : await createStripeDashboardLink();
      return result.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const modeMutation = useMutation({
    mutationFn: (mode: "live" | "test") => updatePaymentsMode(mode),
    onSuccess: async () => {
      toast.success("Payments mode updated");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.paymentAccounts.primary(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stripeContext(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleConnectStripe() {
    if (!hasOAuthStartRoute("stripe")) {
      toast.error("Stripe connect is not configured.");
      return;
    }

    setConnecting(true);
    let url: string;
    try {
      url = getOAuthStartUrl("stripe");
    } catch (err) {
      setConnecting(false);
      toast.error(err instanceof Error ? err.message : "Could not start Stripe connect");
      return;
    }

    const { blocked, popup } = openOAuthPopup(url);
    if (blocked || !popup) {
      setConnecting(false);
      if (blocked) {
        setBlockedOAuthUrl(url);
        setPopupBlockedOpen(true);
      } else {
        toast.error("Could not open the authorization window.");
      }
      return;
    }

    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setConnecting(false);
        void refetch();
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.integrations.businessProviders(),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.integrations.businessList(),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.integrations.businessDetail("stripe"),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.paymentAccounts.primary(),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.payments.stripeContext(),
          }),
        ]);
      }
    }, 500);
  }

  function handleManageAccount() {
    if (!data) return;

    if (data.connectionStatus === "NOT_CONNECTED") {
      handleConnectStripe();
      return;
    }

    if (data.connectionStatus === "CONNECTED_INCOMPLETE") {
      linkMutation.mutate("onboarding");
      return;
    }

    linkMutation.mutate("dashboard");
  }

  if (isLoading) {
    return <LoadingState label="Loading payment account…" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load payment account"}
      </p>
    );
  }

  const statusLines = [
    data?.readinessLabel,
    data?.modeLabel,
    data?.defaultCurrency ? `Currency: ${data.defaultCurrency.toUpperCase()}` : null,
    data?.accountName,
  ].filter(Boolean);

  return (
    <section className={SETTINGS_FORM_SECTION_STACK_CLASS}>
      <div className="space-y-[var(--spacing-1)]">
        <h3 className="text-base font-medium">Primary Account</h3>
        <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
          The default payment account used to accept payments for the business.
        </p>
      </div>

      {statusLines.length > 0 ? (
        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {statusLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {data?.connectionStatus !== "NOT_CONNECTED" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Payments mode</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={data?.paymentsMode === "live" ? "brand" : "outline"}
              disabled={!canManage || modeMutation.isPending}
              onClick={() => modeMutation.mutate("live")}
            >
              Live
            </Button>
            <Button
              type="button"
              size="sm"
              variant={data?.paymentsMode === "test" ? "brand" : "outline"}
              disabled={
                !canManage ||
                modeMutation.isPending ||
                data?.testModeConfigured === false
              }
              onClick={() => modeMutation.mutate("test")}
            >
              Test
            </Button>
          </div>
          {data?.testModeConfigured === false ? (
            <p className="text-xs text-muted-foreground">
              Set STRIPE_SECRET_KEY_TEST to enable sandbox charges.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="brand"
          disabled={!canManage || connecting || linkMutation.isPending}
          onClick={handleManageAccount}
        >
          {connecting
            ? "Connecting…"
            : linkMutation.isPending
              ? "Opening Stripe…"
              : "Manage Account"}
        </Button>
        {canViewTransactions ? (
          <Link
            href="/business/payments?tab=transactions"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            View Transactions
          </Link>
        ) : null}
      </div>

      <OAuthPopupBlockedDialog
        open={popupBlockedOpen}
        onOpenChange={setPopupBlockedOpen}
        oauthUrl={blockedOAuthUrl}
      />
    </section>
  );
}
