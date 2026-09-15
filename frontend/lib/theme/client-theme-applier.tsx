"use client";

import { useEffect } from "react";
import {
  applyClientTheme,
  brandingToClientTheme,
  clearClientTheme,
} from "./apply-client-theme";

interface ClientThemeApplierProps {
  branding: {
    accentColor?: string;
    productName?: string;
    logoUrl?: string;
    publicPageTitle?: string;
    sidebarColor?: string;
  };
}

/** Applies per-business snapshot branding as CSS variable overrides on :root. */
export function ClientThemeApplier({ branding }: ClientThemeApplierProps) {
  const { accentColor, sidebarColor, productName, logoUrl, publicPageTitle } =
    branding;

  useEffect(() => {
    const config = brandingToClientTheme({
      accentColor,
      sidebarColor,
      productName,
      logoUrl,
      publicPageTitle,
    });
    applyClientTheme(config);
    return () => clearClientTheme();
  }, [accentColor, sidebarColor, productName, logoUrl, publicPageTitle]);

  return null;
}
