#!/usr/bin/env node
/**
 * Phase 4 CI bundle budget check.
 * Compares .next/analyze client.json total gzip size to baseline (or env BUNDLE_BUDGET_KB).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const analyzePath = join(process.cwd(), ".next", "analyze", "client.json");
const budgetKb = Number(process.env.BUNDLE_BUDGET_KB ?? 350);
const baselinePath = join(process.cwd(), "bundle-baseline.json");

if (!existsSync(analyzePath)) {
  console.warn(
    "No bundle analyze output. Run ANALYZE=true npm run build first. Skipping budget check.",
  );
  process.exit(0);
}

const report = JSON.parse(readFileSync(analyzePath, "utf8"));
const totalGzipKb = Math.round((report.gzippedSize ?? report.size ?? 0) / 1024);

let baselineKb = budgetKb;
if (existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  baselineKb = baseline.clientGzipKb ?? budgetKb;
}

const warnThreshold = baselineKb * 1.05;

if (totalGzipKb > warnThreshold) {
  console.error(
    `Bundle budget exceeded: ${totalGzipKb}kb gzip > ${warnThreshold}kb threshold (baseline ${baselineKb}kb)`,
  );
  process.exit(process.env.CI ? 1 : 0);
}

console.log(`Bundle OK: ${totalGzipKb}kb gzip (baseline ${baselineKb}kb)`);
