import { describe, expect, it } from "vitest";
import { createElement } from "react";
import {
  collectSelectItemsFromChildren,
  extractSelectItemLabelText,
  isOpaqueSelectValue,
} from "@/components/ui/select-item-labels";

function SelectItem(props: {
  value?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  return createElement("div", props);
}
SelectItem.displayName = "SelectItem";

function SelectContent(props: { children?: React.ReactNode }) {
  return createElement("div", props);
}

describe("select-item-labels", () => {
  it("extracts plain text labels", () => {
    expect(extractSelectItemLabelText("Rooms")).toBe("Rooms");
    expect(extractSelectItemLabelText(["Pre-", "natal"])).toBe("Pre- natal");
  });

  it("collects value/label pairs from nested SelectItem children", () => {
    const children = createElement(
      SelectContent,
      null,
      createElement(SelectItem, { value: "id-1" }, "Rooms"),
      createElement(SelectItem, { value: "id-2", label: "Chairs" }, "ignored"),
    );

    expect(collectSelectItemsFromChildren(children)).toEqual([
      { value: "id-1", label: "Rooms" },
      { value: "id-2", label: "Chairs" },
    ]);
  });

  it("detects opaque UUID values", () => {
    expect(
      isOpaqueSelectValue("d816a5f4-8303-4ab9-a53d-1ede93a4731b"),
    ).toBe(true);
    expect(isOpaqueSelectValue("Rooms")).toBe(false);
    expect(isOpaqueSelectValue("EMAIL")).toBe(false);
  });
});
