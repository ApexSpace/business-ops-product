import * as React from "react";

export type SelectItemDescriptor = {
  value: unknown;
  label: React.ReactNode;
};

const SELECT_ITEM_DISPLAY_NAME = "SelectItem";

function isSelectItemType(type: unknown): boolean {
  if (type == null) return false;
  if (typeof type === "function" || typeof type === "object") {
    const displayName = (type as { displayName?: string }).displayName;
    if (displayName === SELECT_ITEM_DISPLAY_NAME) return true;
  }
  return false;
}

/** Flatten text from simple React node trees for Select item labels. */
export function extractSelectItemLabelText(
  node: React.ReactNode,
): string | undefined {
  if (node == null || typeof node === "boolean") return undefined;
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    const parts = node
      .map((child) => extractSelectItemLabelText(child))
      .filter((part): part is string => Boolean(part && part.trim()));
    return parts.length > 0 ? parts.join(" ") : undefined;
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractSelectItemLabelText(node.props.children);
  }
  return undefined;
}

/**
 * Walk Select children (including SelectContent / Groups) and collect
 * value→label pairs from SelectItem elements so Base UI can resolve the
 * closed trigger label without each page passing `items`.
 */
export function collectSelectItemsFromChildren(
  children: React.ReactNode,
): SelectItemDescriptor[] {
  const items: SelectItemDescriptor[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (isSelectItemType(child.type)) {
      const props = child.props as {
        value?: unknown;
        label?: string;
        children?: React.ReactNode;
      };
      const label =
        props.label ??
        extractSelectItemLabelText(props.children) ??
        (props.value == null ? undefined : String(props.value));
      if (label != null) {
        items.push({ value: props.value, label });
      }
      return;
    }

    const nested = (child.props as { children?: React.ReactNode })?.children;
    if (nested != null) {
      items.push(...collectSelectItemsFromChildren(nested));
    }
  });

  return items;
}

export function isOpaqueSelectValue(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  // UUID v1–v5 / common opaque keys that should never appear as trigger text.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export { SELECT_ITEM_DISPLAY_NAME };
