"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBusinessCheckoutSession,
  subscribeToPlanTier,
  type SubscribePlanTierInput,
} from "@/features/settings/api/business-billing.api";
import type { PlanSelectionMode } from "@/features/settings/utils/plan-tier-position.util";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { ApiClientError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";

export type BusinessTierCheckoutInput = SubscribePlanTierInput & {
  tierSlug: string;
};

function resolveBillingCheckoutError(error: unknown): string | null {
  if (error instanceof ApiClientError) {
    if (error.code === "BUSINESS_OWNER_REQUIRED") {
      return null;
    }
    if (error.code === "MISSING_STRIPE_MAPPING") {
      return "This plan is not connected to Stripe yet. Please contact support.";
    }
    if (error.code === "NO_BUSINESS_CONTEXT") {
      return "No active workspace found. Please refresh and try again.";
    }
    return "Could not start checkout. Please try again or contact support.";
  }
  return "Could not start checkout. Please try again or contact support.";
}

function isOwnerRequiredError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    error.code === "BUSINESS_OWNER_REQUIRED"
  );
}

function redirectToCheckout(url: string) {
  window.location.href = url;
}

export function useBusinessBillingMutation(
  planSelectionMode: PlanSelectionMode = "default",
) {
  const { isAuthenticated, jwt } = useAuth();
  const canManageTeam = useCan(PERMISSIONS["members.invite"]);
  const [redirectingTierSlug, setRedirectingTierSlug] = useState<string | null>(
    null,
  );
  const [ownerRequiredOpen, setOwnerRequiredOpen] = useState(false);

  const useCheckoutSession = planSelectionMode === "trial";

  const handleCheckoutError = useCallback((error: Error) => {
    if (isOwnerRequiredError(error)) {
      setOwnerRequiredOpen(true);
      return;
    }
    const message = resolveBillingCheckoutError(error);
    if (message) {
      toast.error(message);
    }
  }, []);

  const checkoutSessionMutation = useMutation({
    mutationFn: createBusinessCheckoutSession,
    onSuccess: (result) => {
      redirectToCheckout(result.url);
    },
    onError: handleCheckoutError,
    onSettled: () => {
      setRedirectingTierSlug(null);
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: subscribeToPlanTier,
    onSuccess: (result) => {
      if (result.action === "checkout" && result.url) {
        redirectToCheckout(result.url);
        return;
      }
      if (result.action === "tier_updated") {
        toast.success("Plan updated");
        window.location.reload();
      }
    },
    onError: handleCheckoutError,
    onSettled: () => {
      setRedirectingTierSlug(null);
    },
  });

  const isRedirecting =
    checkoutSessionMutation.isPending || subscribeMutation.isPending;

  const startTierCheckout = useCallback(
    (input: BusinessTierCheckoutInput) => {
      if (!isAuthenticated) {
        return;
      }

      const hasBusinessContext =
        jwt?.context === "business" && Boolean(jwt.businessId);
      if (!hasBusinessContext) {
        toast.error(
          "No active workspace found. Please refresh and try again.",
        );
        return;
      }

      if (isRedirecting) {
        return;
      }

      setRedirectingTierSlug(input.tierSlug);

      if (useCheckoutSession) {
        checkoutSessionMutation.mutate({
          planGroupId: input.planGroupId,
          planTierId: input.planTierId,
          billingCycle: input.billingCycle,
        });
        return;
      }

      subscribeMutation.mutate({
        planGroupId: input.planGroupId,
        planTierId: input.planTierId,
        billingCycle: input.billingCycle,
      });
    },
    [
      checkoutSessionMutation,
      isAuthenticated,
      isRedirecting,
      jwt,
      subscribeMutation,
      useCheckoutSession,
    ],
  );

  return {
    startTierCheckout,
    redirectingTierSlug,
    isRedirecting,
    ownerRequiredOpen,
    setOwnerRequiredOpen,
    canManageTeam,
  };
}
