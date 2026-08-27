/**
 * Shared floating overlay placement.
 *
 * Source of truth: Appointment Client / Service (`ComboboxPopup`) —
 * the list opens under the field, not overlapping it.
 *
 * Select, Combobox, DropdownMenu, and Popover all default to these values.
 * Submenus may still use `side="right"`. Explicit `side="top"` is for
 * above-the-field cases (e.g. emoji picker over a composer).
 */
export const OVERLAY_SIDE = "bottom" as const;

/** Gap between the trigger’s bottom edge and the popup. */
export const OVERLAY_SIDE_OFFSET = 4;

/**
 * Base UI Select overlaps the trigger when this is true (selected item
 * lines up with the field). Appointment comboboxes do not — keep false.
 */
export const SELECT_ALIGN_ITEM_WITH_TRIGGER = false;
