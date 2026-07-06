"use client";

import { cn } from "@/lib/utils";
import { CODESOL_BRAND_LOGO_URL } from "./shell-constants";

interface ShellBrandHeaderProps {
  productName?: string;
  logoUrl?: string | null;
  className?: string;
}

export function ShellBrandHeader({
  productName = "CodeSol",
  logoUrl = CODESOL_BRAND_LOGO_URL,
  className,
}: ShellBrandHeaderProps) {
  const resolvedLogoUrl = logoUrl ?? CODESOL_BRAND_LOGO_URL;
  const isWordmarkLogo = resolvedLogoUrl === CODESOL_BRAND_LOGO_URL;

  return (
    <div className={cn("flex items-center gap-2.5 px-1 py-1.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedLogoUrl}
        alt={productName}
        className={cn(
          "shrink-0 object-contain shadow-none",
          isWordmarkLogo
            ? "h-8 w-auto max-w-[148px] rounded-none bg-transparent p-0"
            : "size-6 rounded-[7px] bg-[#4c7cf0] p-1.5",
        )}
      />
      {isWordmarkLogo ? null : (
        <span className="truncate text-[16px] font-bold text-[#12172b] group-data-[collapsible=icon]:hidden dark:text-foreground">
          {productName}
        </span>
      )}
    </div>
  );
}
