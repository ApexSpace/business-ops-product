"use client";

import { cn } from "@/lib/utils";
import {
  INTEGRATION_ICON_SIZE_CLASSES,
  isLocalStaticLogoUrl,
  ProviderBrandIcon,
  resolveIntegrationIconKey,
} from "@/features/integrations/components/integration-provider-icon-registry";

export type IntegrationProviderIconKey = string;

export { resolveIntegrationIconKey };

interface IntegrationProviderIconProps {
  providerKey: IntegrationProviderIconKey;
  providerName?: string;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function IntegrationProviderIcon({
  providerKey,
  providerName,
  logoUrl,
  className,
  size = "md",
}: IntegrationProviderIconProps) {
  const iconKey = resolveIntegrationIconKey(providerKey);
  const sizeClass = INTEGRATION_ICON_SIZE_CLASSES[size];
  const label = providerName ?? providerKey;

  if (logoUrl && isLocalStaticLogoUrl(logoUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        title={label}
        aria-label={label}
        className={cn(
          "shrink-0 rounded-md border border-border/60 object-cover shadow-sm",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={className}
      title={label}
      aria-label={label}
      role="img"
    >
      <ProviderBrandIcon iconKey={iconKey} sizeClass={sizeClass} />
    </div>
  );
}
