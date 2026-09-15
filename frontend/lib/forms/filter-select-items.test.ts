import { describe, expect, it } from "vitest";
import {
  filterSelectItems,
  selectItemMatchesQuery,
} from "./filter-select-items";

const items = [
  { value: "cut", label: "Haircut — $50.00" },
  { value: "facial", label: "Custom Facial — $90.00" },
  { value: null, label: "None" },
];

describe("selectItemMatchesQuery", () => {
  it("matches all items when the query is empty", () => {
    expect(selectItemMatchesQuery(items[0], "")).toBe(true);
    expect(selectItemMatchesQuery(items[0], "   ")).toBe(true);
  });

  it("matches labels case-insensitively", () => {
    expect(selectItemMatchesQuery(items[1], "facial")).toBe(true);
    expect(selectItemMatchesQuery(items[1], "CUSTOM")).toBe(true);
    expect(selectItemMatchesQuery(items[1], "wax")).toBe(false);
  });

  it("matches optional descriptions", () => {
    const withDescription = {
      value: "email",
      label: "Send email",
      description: "Notify the client",
    };
    expect(selectItemMatchesQuery(withDescription, "notify")).toBe(true);
    expect(selectItemMatchesQuery(withDescription, "sms")).toBe(false);
  });
});

describe("filterSelectItems", () => {
  it("returns every item for a blank query", () => {
    expect(filterSelectItems(items, "")).toEqual(items);
  });

  it("filters by substring in the label", () => {
    expect(filterSelectItems(items, "90")).toEqual([items[1]]);
  });
});
