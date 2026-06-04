import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const apiClientRestriction = {
  paths: [
    {
      name: "@/lib/api/client",
      message:
        "Import domain APIs from features/<domain>/api/*.api.ts and hooks instead.",
    },
    {
      name: "@/lib/api-client",
      message:
        "Import domain APIs from features/<domain>/api/*.api.ts and hooks instead.",
    },
  ],
};

const deprecatedTypesApiWarn = {
  paths: [
    {
      name: "@/lib/types/api",
      message:
        "Import from features/<domain>/types or @/lib/types/shared; lib/types/api.ts is a legacy barrel.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", apiClientRestriction],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", apiClientRestriction],
    },
  },
  {
    files: ["features/**/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", apiClientRestriction],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "features/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["features/**/types/**", "lib/types/**"],
    rules: {
      "no-restricted-imports": ["warn", deprecatedTypesApiWarn],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
