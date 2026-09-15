import { describe, expect, it } from "vitest";
import { createDefaultField } from "@/features/forms/utils/field-defaults.util";
import {
  addColumnField,
  balanceColumnsForTallField,
  columnHasTallContent,
  removeColumnField,
  removeNestedFieldFromColumns,
  replaceColumnFieldType,
  updateColumnFieldType,
} from "@/features/forms/utils/column-fields.util";

describe("column-fields.util", () => {
  it("detects tall column content", () => {
    const imageColumn = [createDefaultField("image", 0)];
    const textColumn = [createDefaultField("text", 1)];
    expect(columnHasTallContent(imageColumn)).toBe(true);
    expect(columnHasTallContent(textColumn)).toBe(false);
  });

  it("replaces a column field type while preserving id", () => {
    const columns = [
      [createDefaultField("text", 0)],
      [createDefaultField("text", 1)],
    ];
    const originalId = columns[0][0].id;

    const next = replaceColumnFieldType(columns, 0, 0, "number");
    expect(next[0][0].type).toBe("number");
    expect(next[0][0].id).toBe(originalId);
  });

  it("adds and removes fields within a column", () => {
    const columns = [[createDefaultField("text", 0)]];
    const withExtra = addColumnField(columns, 0, "email");
    expect(withExtra.columns[0]).toHaveLength(2);
    expect(withExtra.columns[0][1].type).toBe("email");
    expect(withExtra.field.type).toBe("email");

    const removed = removeColumnField(withExtra.columns, 0, 1);
    expect(removed[0]).toHaveLength(1);
  });

  it("does not remove the last field in a column", () => {
    const columns = [[createDefaultField("text", 0)]];
    const next = removeColumnField(columns, 0, 0);
    expect(next[0]).toHaveLength(1);
  });

  it("balances sibling column when image is selected", () => {
    const columns = [
      [createDefaultField("text", 0)],
      [createDefaultField("text", 1)],
    ];

    const next = updateColumnFieldType(columns, 0, 0, "image");
    expect(next[0][0].type).toBe("image");
    expect(next[1]).toHaveLength(3);
    expect(next[1].map((field) => field.type)).toEqual(["text", "number", "email"]);
  });

  it("balances the column to the left when image is in the last column", () => {
    const columns = [
      [createDefaultField("text", 0)],
      [createDefaultField("text", 1)],
    ];

    const next = balanceColumnsForTallField(
      [
        columns[0],
        [createDefaultField("image", 1)],
      ],
      1,
    );

    expect(next[0]).toHaveLength(3);
    expect(next[1][0].type).toBe("image");
  });

  it("removes nested fields but keeps at least one per column", () => {
    const columns = [
      [createDefaultField("text", 0), createDefaultField("email", 0)],
      [createDefaultField("text", 1)],
    ];
    const fields = [
      {
        ...createDefaultField("columns"),
        columns,
      },
    ];
    const emailId = columns[0][1].id;
    const next = removeNestedFieldFromColumns(fields, emailId);
    expect(next[0].columns?.[0]).toHaveLength(1);
    expect(next[0].columns?.[1]).toHaveLength(1);
  });
});
