import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const turbopackRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  output: "standalone",
  allowedDevOrigins: [
    "ops.codesoltech.com",
    "app.codesoltech.com",
    "fb-login.codesoltech.com",
  ],
};

export default withBundleAnalyzer(nextConfig);
