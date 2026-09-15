import { describe, expect, it } from "vitest";
import { createDefaultField } from "@/features/forms/utils/field-defaults.util";
import {
  normalizeFormDefinition,
  prepareFormDefinitionForSave,
} from "@/features/forms/utils/form-normalize.util";

describe("form-normalize.util", () => {
  it("prepareFormDefinitionForSave keeps three mixed field types", () => {
    const saved = prepareFormDefinitionForSave({
      fields: [
        {
          id: "f1",
          type: "heading",
          label: "Welcome",
          name: "welcome",
          content: "Hello",
          level: 2,
        },
        {
          id: "f2",
          type: "email",
          label: "Email",
          name: "email",
          validation: { required: true },
          style: { labelColor: "#111111", width: 50 },
        },
        {
          id: "f3",
          type: "select",
          label: "Department",
          name: "department",
          options: [
            { id: "o1", label: "Sales", value: "sales" },
            { id: "o2", label: "Support", value: "support" },
          ],
        },
      ],
      settings: {
        title: "Contact us",
        submitButtonLabel: "Send",
        successMessage: "Thanks",
        showRequiredIndicator: true,
        accentColor: "#6366f1",
      },
    });

    expect(saved.fields).toHaveLength(3);
    expect(saved.fields[0]).toMatchObject({
      id: "f1",
      type: "heading",
      label: "Welcome",
      content: "Hello",
      level: 2,
    });
    expect(saved.fields[1]).toMatchObject({
      id: "f2",
      type: "email",
      validation: { required: true },
      style: { labelColor: "#111111", width: 50 },
    });
    expect(saved.fields[2]).toMatchObject({
      id: "f3",
      type: "select",
      options: [
        { id: "o1", label: "Sales", value: "sales" },
        { id: "o2", label: "Support", value: "support" },
      ],
    });
    expect(saved.settings.accentColor).toBe("#6366f1");
  });

  it("drops corrupt top-level column arrays but keeps valid builder rows", () => {
    const text = createDefaultField("text");
    const email = createDefaultField("email");

    const normalized = normalizeFormDefinition({
      fields: [[], [], text, email] as unknown as typeof text[],
      settings: {
        title: "Form",
        submitButtonLabel: "Submit",
        successMessage: "Thanks",
        showRequiredIndicator: true,
      },
    });

    expect(normalized.fields).toHaveLength(2);
    expect(normalized.fields.map((field) => field.type)).toEqual(["text", "email"]);
  });

  it("preserves columns field nested structure on save", () => {
    const columns = createDefaultField("columns");
    const saved = prepareFormDefinitionForSave({
      fields: [columns],
      settings: {
        title: "Layout",
        submitButtonLabel: "Submit",
        successMessage: "Thanks",
        showRequiredIndicator: true,
      },
    });

    expect(saved.fields).toHaveLength(1);
    expect(saved.fields[0].type).toBe("columns");
    expect(saved.fields[0].columns).toHaveLength(2);
    expect(saved.fields[0].columns?.[0]).toHaveLength(1);
    expect(saved.fields[0].columns?.[0][0].type).toBe("text");
  });
});
