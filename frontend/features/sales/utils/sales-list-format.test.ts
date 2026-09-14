import { describe, expect, it } from "vitest";
import { saleStatusLabel, saleStatusTone } from "./sales-list-format";

describe("saleStatusLabel", () => {
  it("labels VOID as Void", () => {
    expect(saleStatusLabel({ status: "VOID", isOpen: false })).toBe("Void");
  });

  it("labels open sales as Open", () => {
    expect(saleStatusLabel({ status: "OPEN", isOpen: true })).toBe("Open");
  });

  it("labels paid closed sales as Closed", () => {
    expect(saleStatusLabel({ status: "PAID", isOpen: false })).toBe("Closed");
  });

  it("does not label PARTIAL as Closed", () => {
    expect(saleStatusLabel({ status: "PARTIAL", isOpen: false })).toBe(
      "Partial",
    );
  });
});

describe("saleStatusTone", () => {
  it("uses a distinct tone for PARTIAL so it is not styled as Closed", () => {
    expect(saleStatusTone({ status: "PARTIAL", isOpen: false })).toBe(
      "neutral",
    );
    expect(saleStatusTone({ status: "PAID", isOpen: false })).toBe("closed");
  });
});
