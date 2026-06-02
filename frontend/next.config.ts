import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudflare tunnel hostnames to load Next dev assets (HMR, /_next/*)
  allowedDevOrigins: [
    "ops.codesoltech.com",
    "app.codesoltech.com",
    "fb-login.codesoltech.com",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
