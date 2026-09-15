import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AUTH_FIELD_INPUT_CLASS } from "@/lib/design/auth-tokens";
import { COMBOBOX_INPUT_CLASS } from "@/components/ui/combobox";
import { DATA_TABLE_SEARCH_STANDALONE_CLASS } from "@/lib/design/data-table-tokens";
import {
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FIELD_LABEL_SHELL_CLASS,
} from "@/lib/design/drawer-tokens";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readFrontend(rel: string) {
  return readFileSync(join(frontendRoot, rel), "utf8");
}

describe("ink roles (TXT-01 / TXT-11 / TXT-14)", () => {
  it("TXT-01: documents body / heading-entity / secondary / placeholder roles", () => {
    const globals = readFrontend("app/globals.css");
    const theme = readFrontend("lib/theme/codesol-default-theme.css");

    expect(globals).toContain("Body / default ink");
    expect(globals).toContain("Heading / entity name");
    expect(globals).toContain("placeholder:text-foreground-subtle");
    expect(globals).not.toContain("text-[#5F2CB2]");
    expect(globals).not.toContain("text-[#4A4A4A]");
    expect(globals).toContain("text-violet-primary-dark");
    expect(globals).toContain("var(--drawer-text-body)");

    expect(theme).toContain("--foreground-subtle");
    expect(theme).toContain("Heading / entity name");
    expect(theme).toContain("--drawer-text-secondary");
  });

  it("TXT-11: shared inputs and search recipes use placeholder subtle ink", () => {
    expect(readFrontend("components/ui/input.tsx")).toContain(
      "placeholder:text-foreground-subtle",
    );
    expect(readFrontend("components/ui/textarea.tsx")).toContain(
      "placeholder:text-foreground-subtle",
    );
    expect(readFrontend("components/ui/select.tsx")).toContain(
      "data-placeholder:text-foreground-subtle",
    );
    expect(COMBOBOX_INPUT_CLASS).toContain("placeholder:text-foreground-subtle");
    expect(AUTH_FIELD_INPUT_CLASS).toContain(
      "placeholder:text-foreground-subtle",
    );
    expect(DATA_TABLE_SEARCH_STANDALONE_CLASS).toContain(
      "placeholder:text-foreground-subtle",
    );
    expect(DATA_TABLE_SEARCH_STANDALONE_CLASS).not.toContain(
      "placeholder:text-grey-tertiary-normal",
    );
    expect(AUTH_FIELD_INPUT_CLASS).not.toContain(
      "placeholder:text-muted-foreground",
    );
  });

  it("TXT-14: FormSheet and spine drawer labels share --drawer-text-secondary", () => {
    expect(DRAWER_FIELD_LABEL_CLASS).toContain(
      "text-[var(--drawer-text-secondary)]",
    );
    expect(DRAWER_FIELD_LABEL_SHELL_CLASS).toContain(
      "text-[var(--drawer-text-secondary)]",
    );
    expect(DRAWER_FIELD_LABEL_SHELL_CLASS).not.toContain(
      "text-muted-foreground",
    );
  });
});
