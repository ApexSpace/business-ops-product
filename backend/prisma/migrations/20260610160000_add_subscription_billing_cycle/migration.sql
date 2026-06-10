-- Add billing cycle to current subscription state (payments already store per-payment cycle).
ALTER TABLE "business_subscriptions" ADD COLUMN "billingCycle" "BusinessSubscriptionBillingCycle";
