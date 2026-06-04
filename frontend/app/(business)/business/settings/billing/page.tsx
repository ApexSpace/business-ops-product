import { SettingsPlaceholder } from "@/features/settings/components/settings-placeholder";

export default function BusinessSettingsBillingPage() {
  return (
    <SettingsPlaceholder
      title="Billing"
      description="Your subscription and plan details."
      comingSoonTitle="Subscription & billing"
      comingSoonDescription="Plan and billing for this business are managed by your platform administrator. A self-service billing view will be added when business billing APIs are available."
    />
  );
}
