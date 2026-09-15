import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DATA_TABLE_SALE_NUMBER_CLASS } from "@/lib/design/data-table-tokens";
import { SALES_DRAWER_LINE_CARD_CHEVRON_CLASS } from "@/features/sales/styles/sales-drawer-tokens";

const FRONTEND_ROOT = join(__dirname, "../..");

const TXT_02_FILES = [
  "features/sales/components/sales-payment-drawer-form.tsx",
  "features/sales/components/sale-edit-drawer-content.tsx",
  "features/sales/components/checkout-inline-add-section.tsx",
  "features/sales/components/checkout-line-item-row.tsx",
  "features/sales/components/new-checkout-drawer.tsx",
  "features/sales/components/gift-card-sale-dialog.tsx",
  "features/sales/components/package-sale-dialog.tsx",
  "features/sales/components/sale-close-panel.tsx",
  "features/sales/components/checkout-change-price-dialog.tsx",
  "features/sales/components/sales-workspace.tsx",
  "features/sales/styles/sales-drawer-tokens.ts",
  "features/gift-cards/components/gift-card-payment-picker.tsx",
  "features/payments/payments-kit/invoice-collect-payment-panel.tsx",
] as const;

const BANNED_TEXT_HEX = [
  "text-[#8A8A8A]",
  "text-[#8a8a8a]",
  "text-[#524346]",
  "text-[#6B6B6B]",
  "text-[#6b6b6b]",
] as const;

describe("TXT-02 / TXT-09 sales text tokens", () => {
  it("maps drawer chevron ink to --drawer-text-secondary", () => {
    expect(SALES_DRAWER_LINE_CARD_CHEVRON_CLASS).toContain(
      "text-[var(--drawer-text-secondary)]",
    );
  });

  it("keeps sale # on the brand text class (TXT-04)", () => {
    expect(DATA_TABLE_SALE_NUMBER_CLASS).toContain("text-violet-primary-normal");
  });

  it("does not paste secondary/label/meta hex in sales checkout files", () => {
    for (const relative of TXT_02_FILES) {
      const source = readFileSync(join(FRONTEND_ROOT, relative), "utf8");
      for (const hexClass of BANNED_TEXT_HEX) {
        expect(source, `${relative} still has ${hexClass}`).not.toContain(
          hexClass,
        );
      }
    }
  });

  it("uses text-success for sales totals instead of Tailwind emerald", () => {
    const salesTotals = [
      "features/sales/components/sale-edit-drawer-content.tsx",
      "features/sales/components/sales-workspace.tsx",
    ] as const;

    for (const relative of salesTotals) {
      const source = readFileSync(join(FRONTEND_ROOT, relative), "utf8");
      expect(source, `${relative} still has text-emerald-700`).not.toContain(
        "text-emerald-700",
      );
      expect(source).toContain("text-success");
    }
  });
});
