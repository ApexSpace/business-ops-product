import path from "node:path";
import type { NextConfig } from "next";

const reactDir = path.join(process.cwd(), "node_modules/react");
const reactDomDir = path.join(process.cwd(), "node_modules/react-dom");

const nextConfig: NextConfig = {
  // Allow Cloudflare tunnel hostnames to load Next dev assets (HMR, /_next/*)
  allowedDevOrigins: [
    "ops.codesoltech.com",
    "app.codesoltech.com",
    "fb-login.codesoltech.com",
  ],
  webpack: (config, { isServer, dev }) => {
    // React 19's package "react-server" export has no createContext/hooks.
    // Webpack client chunks (lucide-react, react-hook-form, etc.) must use the
    // full client build — bypass conditional exports via explicit CJS paths.
    if (!isServer && dev) {
      const reactBundle = path.join(reactDir, "cjs/react.development.js");
      const reactDomBundle = path.join(
        reactDomDir,
        "cjs/react-dom.development.js",
      );

      config.resolve.alias = {
        ...config.resolve.alias,
        react: reactBundle,
        "react-dom": reactDomBundle,
        "react/jsx-runtime": path.join(
          reactDir,
          "cjs/react-jsx-runtime.development.js",
        ),
        "react/jsx-dev-runtime": path.join(
          reactDir,
          "cjs/react-jsx-dev-runtime.development.js",
        ),
        "react-dom/client": path.join(
          reactDomDir,
          "cjs/react-dom-client.development.js",
        ),
      };
      config.resolve.conditionNames = [
        "browser",
        "import",
        "require",
        "default",
      ];
    }
    return config;
  },
};

export default nextConfig;
