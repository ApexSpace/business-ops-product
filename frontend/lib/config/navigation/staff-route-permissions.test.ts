import { describe, expect, it } from "vitest";

import {

  canAccessBusinessStaffRoute,

  resolveBusinessRouteStaffPermission,

} from "@/lib/config/navigation/staff-route-permissions";



describe("staff route permissions", () => {

  it("requires contacts.view_last_names for contacts routes", () => {

    expect(resolveBusinessRouteStaffPermission("/business/contacts")).toBe(

      "contacts.view_last_names",

    );

    expect(

      canAccessBusinessStaffRoute("/business/contacts", {

        businessRole: "MEMBER",

        staffPermissions: {},

      }),

    ).toBe(false);

    expect(

      canAccessBusinessStaffRoute("/business/contacts", {

        businessRole: "MEMBER",

        staffPermissions: { "contacts.access": true },

      }),

    ).toBe(false);

    expect(

      canAccessBusinessStaffRoute("/business/contacts", {

        businessRole: "MEMBER",

        staffPermissions: { "contacts.view_last_names": true },

      }),

    ).toBe(true);

  });



  it("allows admins all routes", () => {

    expect(

      canAccessBusinessStaffRoute("/business/payments", {

        businessRole: "ADMIN",

        staffPermissions: {},

      }),

    ).toBe(true);

  });



  it("gates settings via settings helpers", () => {

    expect(

      canAccessBusinessStaffRoute("/business/settings/profile", {

        businessRole: "MEMBER",

        staffPermissions: {},

      }),

    ).toBe(false);

    expect(

      canAccessBusinessStaffRoute("/business/settings/appearance", {

        businessRole: "MEMBER",

        staffPermissions: {},

      }),

    ).toBe(true);

  });

});


