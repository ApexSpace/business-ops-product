import { describe, expect, it } from "vitest";
import {
  DATA_TABLE_CELL_CLASS,
  DATA_TABLE_COLUMN_CLASS,
  DATA_TABLE_COLUMN_INNER_CLASS,
  DATA_TABLE_GRID_CLASS,
  DATA_TABLE_HEAD_CELL_CLASS,
  DATA_TABLE_SEARCH_STANDALONE_CLASS,
  DATA_TABLE_SPACER_CELL_CLASS,
} from "@/lib/design/data-table-tokens";

describe("data table column layout", () => {
  it("does not use fixed layout that equal-stretches columns", () => {
    expect(DATA_TABLE_GRID_CLASS).toContain("table-auto");
    expect(DATA_TABLE_GRID_CLASS).not.toContain("table-fixed");
  });

  it("applies the column width token as width, not ignored min-width on td", () => {
    expect(DATA_TABLE_COLUMN_CLASS).toContain(
      "w-[max(1%,var(--table-column-min-width))]",
    );
    expect(DATA_TABLE_COLUMN_INNER_CLASS).toContain(
      "--table-column-min-width",
    );
    expect(DATA_TABLE_HEAD_CELL_CLASS).toContain("--table-column-padding-x");
    expect(DATA_TABLE_CELL_CLASS).toContain("--table-column-padding-x");
    expect(DATA_TABLE_SPACER_CELL_CLASS).toContain("w-full");
  });

  it("uses tertiary ink for standalone search placeholders", () => {
    expect(DATA_TABLE_SEARCH_STANDALONE_CLASS).toContain(
      "placeholder:text-foreground-subtle",
    );
  });
});
