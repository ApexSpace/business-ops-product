"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscribeToPlanTier } from "@/features/platform/api/plan-tier-subscribe.api";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";
import { isPlanTierStripeCheckoutReady } from "@/features/platform/utils/plan-tier-stripe.util";
import { ApiClientError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { useAppRouter } from "@/lib/hooks/use-app-router";

const SUBSCRIBE_ERROR_MESSAGES: Record<string, string> = {
  MISSING_STRIPE_MAPPING: "This plan is not connected to Stripe yet.",
  ALREADY_ON_TIER: "Already on this plan",
  NO_BUSINESS_CONTEXT: "Sign in to a business workspace to subscribe.",
  MANUAL_BILLING_PLAN_CHANGE:
    "Your plan is managed by our team. Change plans from billing settings.",
};

function tierStripeMapping(
  tier: PublicPricingTier,
): { monthlyPriceId: string; yearlyPriceId: string } {
  return {
    monthlyPriceId: tier.stripeMonthlyEnabled ? "configured" : "",
    yearlyPriceId: tier.stripeYearlyEnabled ? "configured" : "",
  };
}

function isTierCheckoutReady(
  tier: PublicPricingTier,
  billingCycle: "MONTHLY" | "YEARLY",
): boolean {
  if (billingCycle === "MONTHLY") {
    return Boolean(tier.stripeMonthlyEnabled ?? tier.stripeCheckoutEnabled);
  }
  return Boolean(tier.stripeYearlyEnabled ?? tier.stripeCheckoutEnabled);
}

export function usePlanTierSubscribe(planGroupId: string) {
  const router = useAppRouter();
  const { isAuthenticated } = useAuth();
  const [subscribingTierSlug, setSubscribingTierSlug] = useState<string | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: subscribeToPlanTier,
    onSuccess: (result) => {
      console.debug("[plan-tier-cta]", {
        source: "use-plan-tier-subscribe",
        event: "mutation_success",
        action: result.action,
        hasUrl: Boolean(result.action === "checkout" && result.url),
        sessionId:
          result.action === "checkout" ? result.sessionId ?? null : null,
      });
      if (result.action === "checkout" && result.url) {
        window.location.href = result.url;
        return;
      }
      if (result.action === "tier_updated") {
        toast.success("Plan updated");
        window.location.reload();
      }
    },
    onError: (error: Error) => {
      console.debug("[plan-tier-cta]", {
        source: "use-plan-tier-subscribe",
        event: "mutation_error",
        code: error instanceof ApiClientError ? error.code ?? null : null,
        message: error.message,
      });
      if (error instanceof ApiClientError && error.code) {
        const message = SUBSCRIBE_ERROR_MESSAGES[error.code] ?? error.message;
        toast.error(message);
        return;
      }
      toast.error(error.message || "Unable to start checkout");
    },
    onSettled: () => {
      setSubscribingTierSlug(null);
    },
  });

  const subscribe = useCallback(
    (tier: PublicPricingTier, billingCycle: "MONTHLY" | "YEARLY") => {
      const checkoutReady = isTierCheckoutReady(tier, billingCycle);
      console.debug("[plan-tier-cta]", {
        source: "use-plan-tier-subscribe",
        event: "subscribe_called",
        planGroupId,
        planTierId: tier.planTierId ?? null,
        tierSlug: tier.slug,
        tierName: tier.name,
        billingCycle,
        isAuthenticated,
        isTierCheckoutReady: checkoutReady,
      });

      if (!tier.planTierId) {
        console.debug("[plan-tier-cta]", {
          source: "use-plan-tier-subscribe",
          event: "subscribe_aborted",
          reason: "missing_plan_tier_id",
        });
        toast.error("This plan is not available for checkout.");
        return;
      }

      if (!checkoutReady) {
        console.debug("[plan-tier-cta]", {
          source: "use-plan-tier-subscribe",
          event: "subscribe_aborted",
          reason: "stripe_not_ready",
        });
        toast.error("This plan is not connected to Stripe yet.");
        return;
      }

      if (!isAuthenticated) {
        console.debug("[plan-tier-cta]", {
          source: "use-plan-tier-subscribe",
          event: "subscribe_aborted",
          reason: "not_authenticated",
        });
        const returnUrl = encodeURIComponent(
          typeof window !== "undefined" ? window.location.href : "/",
        );
        router.push(`/login?returnUrl=${returnUrl}`);
        return;
      }

      console.debug("[plan-tier-cta]", {
        source: "use-plan-tier-subscribe",
        event: "mutation_start",
        planGroupId,
        planTierId: tier.planTierId,
        billingCycle,
      });
      setSubscribingTierSlug(tier.slug);
      mutation.mutate({
        planGroupId,
        planTierId: tier.planTierId,
        billingCycle,
      });
    },
    [isAuthenticated, mutation, planGroupId, router],
  );

  return {
    subscribe,
    subscribingTierSlug,
    isSubscribing: mutation.isPending,
  };
}

export function isPublicTierStripeReady(
  tier: PublicPricingTier,
  billingCycle: "MONTHLY" | "YEARLY",
): boolean {
  const stripe = tierStripeMapping(tier);
  return isPlanTierStripeCheckoutReady(stripe, billingCycle);
}
