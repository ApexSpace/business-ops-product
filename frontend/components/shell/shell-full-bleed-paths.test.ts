import { describe, expect, it } from "vitest";
import {
  isAppsMasterDetailWorkspacePath,
  isBusinessSettingsWorkspacePath,
  isDataTableListPath,
  isReportsWorkspacePath,
} from "./shell-full-bleed-paths";

describe("isAppsMasterDetailWorkspacePath", () => {
  it("matches Services, Resources, and Team Apps (and nested routes)", () => {
    expect(isAppsMasterDetailWorkspacePath("/business/settings/services")).toBe(
      true,
    );
    expect(
      isAppsMasterDetailWorkspacePath("/business/settings/resources"),
    ).toBe(true);
    expect(isAppsMasterDetailWorkspacePath("/business/settings/team")).toBe(
      true,
    );
    expect(
      isAppsMasterDetailWorkspacePath("/business/settings/team/member-1"),
    ).toBe(true);
  });

  it("does not match DataTable Apps or remaining Settings pages", () => {
    expect(isAppsMasterDetailWorkspacePath("/business/settings/forms")).toBe(
      false,
    );
    expect(
      isAppsMasterDetailWorkspacePath("/business/settings/automations"),
    ).toBe(false);
    expect(
      isAppsMasterDetailWorkspacePath("/business/settings/pipelines"),
    ).toBe(false);
    expect(
      isAppsMasterDetailWorkspacePath("/business/settings/integrations"),
    ).toBe(false);
    expect(isAppsMasterDetailWorkspacePath("/business/settings")).toBe(false);
    expect(isAppsMasterDetailWorkspacePath("/business/settings/profile")).toBe(
      false,
    );
    expect(isAppsMasterDetailWorkspacePath("/business/sales")).toBe(false);
  });
});

describe("full-bleed workspace paths stay distinct", () => {
  it("keeps migrated master-detail Apps out of Settings chrome paths", () => {
    expect(isBusinessSettingsWorkspacePath("/business/settings/services")).toBe(
      false,
    );
    expect(isBusinessSettingsWorkspacePath("/business/settings/profile")).toBe(
      true,
    );
  });

  it("treats Reports as its own full-bleed workspace", () => {
    expect(isReportsWorkspacePath("/business/reports")).toBe(true);
    expect(isReportsWorkspacePath("/business/reports/sales")).toBe(true);
    expect(isReportsWorkspacePath("/business/settings/reports")).toBe(false);
  });
});

describe("isDataTableListPath", () => {
  it("matches Sales, Forms, and Contacts list", () => {
    expect(isDataTableListPath("/business/sales")).toBe(true);
    expect(isDataTableListPath("/business/settings/forms")).toBe(true);
    expect(isDataTableListPath("/business/contacts")).toBe(true);
  });

  it("does not match contact workspace or form builder", () => {
    expect(isDataTableListPath("/business/contacts/abc")).toBe(false);
    expect(isDataTableListPath("/business/settings/forms/abc/edit")).toBe(
      false,
    );
  });
});
