import { describe, expect, it } from "vitest";
import {
  countRegistryItemsByCategory,
  filterRegistryItems,
  groupRegistryItemsByCategory,
} from "@/features/automations/utils/metadata-grouping.util";

const categories = [
  {
    key: "appointment",
    label: "Appointment",
    description: "",
    sortOrder: 30,
    scopes: ["trigger" as const],
  },
  {
    key: "contact",
    label: "Contact",
    description: "",
    sortOrder: 10,
    scopes: ["trigger" as const],
  },
];

const items = [
  {
    key: "appointment.booked",
    category: "appointment",
    label: "Appointment booked",
    description: "When an appointment is created",
  },
  {
    key: "contact.created",
    category: "contact",
    label: "Contact created",
    description: "When a contact is created",
  },
  {
    key: "appointment.updated",
    category: "appointment",
    label: "Appointment updated",
    description: "When appointment details change",
  },
];

describe("metadata grouping utils", () => {
  it("filters registry items by label, key, and category", () => {
    const filtered = filterRegistryItems(items, "appointment");
    expect(filtered.map((item) => item.key)).toEqual([
      "appointment.booked",
      "appointment.updated",
    ]);
  });

  it("groups items by category sort order", () => {
    const grouped = groupRegistryItemsByCategory(items, categories);
    expect(grouped.map((group) => group.category.key)).toEqual([
      "contact",
      "appointment",
    ]);
    expect(grouped[1]?.items.map((item) => item.key)).toEqual([
      "appointment.booked",
      "appointment.updated",
    ]);
  });

  it("counts items per category", () => {
    expect(countRegistryItemsByCategory(items)).toEqual({
      appointment: 2,
      contact: 1,
    });
  });
});
