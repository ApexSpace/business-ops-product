"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CODESOL_BRAND_LOGO_URL } from "./shell-constants";

interface DashboardNavbarLogoProps {
  productName?: string;
  logoUrl?: string | null;
  href?: string;
  className?: string;
}

export function DashboardNavbarLogo({
  productName = "PandaCue",
  logoUrl = CODESOL_BRAND_LOGO_URL,
  href = "/business/dashboard",
  className,
}: DashboardNavbarLogoProps) {
  const resolvedLogoUrl = logoUrl ?? CODESOL_BRAND_LOGO_URL;

  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      aria-label={productName}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedLogoUrl}
        alt=""
        className="h-11 w-auto max-h-11 max-w-[180px] shrink-0 object-contain"
      />
    </Link>
  );
}
