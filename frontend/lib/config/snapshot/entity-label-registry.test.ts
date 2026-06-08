import { describe, expect, it } from "vitest";
import { DEFAULT_TERMINOLOGY } from "./default-terminology";
import {
  DEFAULT_ENTITY_LABELS,
  ENTITY_NAV_KEYS,
  NAV_LABEL_KEYS,
  ORPHAN_NAV_LABEL_KEYS,
  deriveOrphanNavLabelKeys,
  expandEntityLabels,
  flattenEntityLabels,
  resetEntityLabels,
  type SnapshotEntityId,
} from "./entity-label-registry";

describe("entity-label-registry", () => {
  it("expandEntityLabels fills missing fields from defaults for old snapshots", () => {
    const legacy = {
      "nav.contacts": "Patients",
      "entities.contact.plural": "Patients",
      "entities.contact.singular": "Patient",
    };

    const expanded = expandEntityLabels(legacy);
    expect(expanded.contact.menu_name).toBe("Patients");
    expect(expanded.contact.name).toBe("Patients");
    expect(expanded.contact.singular_name).toBe("Patient");
    expect(expanded.contact.add_new_item).toBe(
      DEFAULT_ENTITY_LABELS.contact.add_new_item,
    );
    expect(expanded.contact.not_found).toBe(
      DEFAULT_ENTITY_LABELS.contact.not_found,
    );
  });

  it("flattenEntityLabels writes flat terminology keys", () => {
    const expanded = expandEntityLabels({});
    expanded.contact = {
      ...expanded.contact,
      name: "Clients",
      singular_name: "Client",
      menu_name: "Clients",
      add_new_item: "Add New Client",
    };

    const flat = flattenEntityLabels(expanded, { "nav.dashboard": "Home" });
    expect(flat["entities.contact.plural"]).toBe("Clients");
    expect(flat["entities.contact.singular"]).toBe("Client");
    expect(flat["nav.contacts"]).toBe("Clients");
    expect(flat["entities.contact.addNewItem"]).toBe("Add New Client");
    expect(flat["nav.dashboard"]).toBe("Home");
  });

  it("roundtrips expand → flatten → expand", () => {
    const source = {
      ...DEFAULT_TERMINOLOGY,
      "nav.contacts": "Patients",
      "entities.contact.addNewItem": "Add New Patient",
    };

    const expanded = expandEntityLabels(source);
    const flat = flattenEntityLabels(expanded, source);
    const reExpanded = expandEntityLabels(flat);

    for (const entityId of Object.keys(DEFAULT_ENTITY_LABELS) as SnapshotEntityId[]) {
      expect(reExpanded[entityId]).toEqual(expanded[entityId]);
    }
  });

  it("ORPHAN_NAV_LABEL_KEYS lists only nav keys without an entity", () => {
    const derived = deriveOrphanNavLabelKeys();
    const entityNavKeys = new Set(Object.values(ENTITY_NAV_KEYS));
    for (const key of NAV_LABEL_KEYS) {
      if (entityNavKeys.has(key)) {
        expect(derived).not.toContain(key);
      }
    }
    expect(derived).toContain("nav.dashboard");
    expect(derived).toHaveLength(1);
    expect(ORPHAN_NAV_LABEL_KEYS).toEqual(derived);
  });

  it("resetEntityLabels restores defaults for one entity", () => {
    const customized = {
      ...DEFAULT_TERMINOLOGY,
      "nav.contacts": "Patients",
      "entities.contact.plural": "Patients",
      "entities.contact.addNewItem": "Add New Patient",
      "nav.leads": "Prospects",
    };

    const reset = resetEntityLabels("contact", customized);
    expect(reset["nav.contacts"]).toBe(DEFAULT_TERMINOLOGY["nav.contacts"]);
    expect(reset["entities.contact.plural"]).toBe(
      DEFAULT_TERMINOLOGY["entities.contact.plural"],
    );
    expect(reset["nav.leads"]).toBe("Prospects");
  });
});
