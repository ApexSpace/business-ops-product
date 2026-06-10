#!/usr/bin/env node
/**
 * Audits frontend business routes against the route-capability map.
 * Run: node frontend/scripts/audit-route-capability-map.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const APP_BUSINESS = join(ROOT, "app", "(business)", "business");

const MAPPED_ROUTES = [
  "/business/contacts",
  "/business/leads",
  "/business/pipelines",
  "/business/work-items",
  "/business/conversations",
  "/business/appointments",
  "/business/payments",
  "/business/invoices",
  "/business/estimates",
  "/business/settings/calendars",
  "/business/settings/pipelines",
  "/business/settings/chatbots",
  "/business/settings/integrations",
];

const GUARDED_BACKEND = [
  "payments",
  "invoices",
  "estimates",
  "conversations",
  "appointments",
  "calendars",
  "chatbots",
];

const UNGUARDED_BACKEND = [
  "contacts (TODO phase 5)",
  "pipelines (TODO phase 5)",
];

const CORE_SAFE = [
  "/business/dashboard",
  "/business/settings/profile",
  "/business/settings/billing",
  "/business/access-blocked",
  "/business/feature-unavailable",
];

function collectRoutes(dir, base = "/business") {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry.startsWith("(") || entry === "api") continue;
      const segment = entry.startsWith("[") ? `:${entry.slice(1, -1)}` : entry;
      routes.push(...collectRoutes(full, `${base}/${segment}`));
      continue;
    }
    if (entry === "page.tsx" || entry === "page.ts") {
      routes.push(base);
    }
  }
  return routes;
}

const discovered = collectRoutes(APP_BUSINESS).sort();
const unmapped = discovered.filter(
  (route) =>
    !MAPPED_ROUTES.includes(route) &&
    !CORE_SAFE.includes(route) &&
    !route.startsWith("/business/settings/profile") &&
    !route.startsWith("/business/settings/team") &&
    !route.startsWith("/business/settings/notifications") &&
    !route.startsWith("/business/settings/appearance") &&
    !route.startsWith("/business/settings/financial") &&
    !route.startsWith("/business/settings/templates") &&
    !route.startsWith("/business/settings/automations") &&
    !route.startsWith("/business/settings/services"),
);

console.log("Route capability audit\n");
console.log("Mapped routes:");
for (const route of MAPPED_ROUTES) console.log(`  ✓ ${route}`);

console.log("\nCore safe routes:");
for (const route of CORE_SAFE) console.log(`  ○ ${route}`);

console.log("\nDiscovered business routes:");
for (const route of discovered) console.log(`  · ${route}`);

console.log("\nUnmapped operational routes:");
if (unmapped.length === 0) {
  console.log("  (none)");
} else {
  for (const route of unmapped) console.log(`  ! ${route}`);
}

console.log("\nBackend guarded controllers:");
for (const name of GUARDED_BACKEND) console.log(`  ✓ ${name}`);

console.log("\nBackend not yet guarded:");
for (const name of UNGUARDED_BACKEND) console.log(`  TODO ${name}`);

console.log(`\nSummary: ${MAPPED_ROUTES.length} mapped, ${unmapped.length} unmapped, ${GUARDED_BACKEND.length} guarded modules`);
