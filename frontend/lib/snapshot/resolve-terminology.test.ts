import { describe, expect, it } from "vitest";
import {
  createEntityLabelResolver,
  createTerminologyResolver,
  resolveEntityLabel,
  resolveNavEntityLabels,
  resolveTerminology,
} from "./resolve-terminology";

describe("resolveTerminology", () => {
  it("prefers snapshot terminology over defaults and fallback", () => {
    expect(
      resolveTerminology("nav.contacts", "Fallback", {
        "nav.contacts": "Patients",
      }),
    ).toBe("Patients");
  });

  it("uses DEFAULT_TERMINOLOGY when key missing in snapshot map", () => {
    expect(resolveTerminology("nav.dashboard", "Fallback", {})).toBe("Dashboard");
  });

  it("uses explicit fallback when key is unknown everywhere", () => {
    expect(resolveTerminology("custom.unknown", "Custom Label", {})).toBe(
      "Custom Label",
    );
  });

  it("createTerminologyResolver returns a stable t(key, fallback) helper", () => {
    const t = createTerminologyResolver({ "nav.contacts": "Clients" });
    expect(t("nav.contacts", "Contacts")).toBe("Clients");
    expect(t("missing.key", "Missing")).toBe("Missing");
  });

  it("resolveEntityLabel maps entity fields to flat keys", () => {
    expect(
      resolveEntityLabel("contact", "add_new_item", "Fallback", {
        "entities.contact.addNewItem": "Add New Patient",
      }),
    ).toBe("Add New Patient");
  });

  it("createEntityLabelResolver returns tEntity helper", () => {
    const tEntity = createEntityLabelResolver({
      "entities.lead.addNewItem": "Add New Prospect",
    });
    expect(tEntity("lead", "add_new_item", "Add New Lead")).toBe(
      "Add New Prospect",
    );
  });

  it("resolveNavEntityLabels maps snapshot terminology to nav label keys", () => {
    const labels = resolveNavEntityLabels({
      "entities.contact.plural": "Patients",
      "entities.workItem.plural": "Treatments",
    });
    expect(labels.contacts).toBe("Patients");
    expect(labels.workItems).toBe("Treatments");
    expect(labels.leads).toBe("Leads");
  });
});
