import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  /** Required for correct standalone output in the npm workspaces monorepo. */
  outputFileTracingRoot: repoRoot,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "luxon",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@tanstack/react-table",
    ],
  },
  /** Expose backend origin to the browser for embed/public pricing URLs (falls back to BACKEND_URL). */
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
      process.env.BACKEND_URL?.trim() ||
      "",
    NEXT_PUBLIC_BACKEND_WS_URL:
      process.env.NEXT_PUBLIC_BACKEND_WS_URL?.trim() || "",
    NEXT_PUBLIC_ENABLE_WEBSOCKET:
      process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET?.trim() || "",
    NEXT_PUBLIC_ENABLE_SSE:
      process.env.NEXT_PUBLIC_ENABLE_SSE?.trim() || "",
    NEXT_PUBLIC_REALTIME_TRANSPORT:
      process.env.NEXT_PUBLIC_REALTIME_TRANSPORT?.trim() || "",
  },
  output: "standalone",
  async rewrites() {
    // Browsers still request /favicon.ico by default. Serve the branding PNG
    // instead of shipping a second icon file that fights metadata.icons.
    return [
      {
        source: "/favicon.ico",
        destination: "/branding/favicon_logo.png",
      },
    ];
  },
  allowedDevOrigins: [
    "ops.codesoltech.com",
    "app.codesoltech.com",
    "fb-login.codesoltech.com",
    "dev.pandacue.com",
    "dev-api.pandacue.com",
  ],
};

export default withBundleAnalyzer(nextConfig);
