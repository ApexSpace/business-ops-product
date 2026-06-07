import { describe, expect, it } from "vitest";
import { isPublicPath, isExplicitlyProtectedPath } from "./public-routes";

describe("isPublicPath", () => {
  it("allows auth pages", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/select-context")).toBe(true);
  });

  it("allows canonical public resource routes", () => {
    expect(isPublicPath("/book/acme-calendar")).toBe(true);
    expect(isPublicPath("/calendar/acme-calendar")).toBe(true);
    expect(isPublicPath("/invoice/abc123")).toBe(true);
    expect(isPublicPath("/estimate/abc123")).toBe(true);
    expect(isPublicPath("/payment/abc123")).toBe(true);
    expect(isPublicPath("/chat/bot-key")).toBe(true);
    expect(isPublicPath("/widget/chat/bot-key")).toBe(true);
    expect(isPublicPath("/form/contact-us")).toBe(true);
    expect(isPublicPath("/public/anything")).toBe(true);
  });

  it("allows legacy public paths", () => {
    expect(isPublicPath("/pay/invoice/token")).toBe(true);
    expect(isPublicPath("/embed/calendar/slug")).toBe(true);
    expect(isPublicPath("/widget/chatbot/key")).toBe(true);
  });

  it("allows oauth callbacks", () => {
    expect(isPublicPath("/oauth/callback")).toBe(true);
  });

  it("rejects protected app routes", () => {
    expect(isPublicPath("/business/dashboard")).toBe(false);
    expect(isPublicPath("/platform/users")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
  });
});

describe("isExplicitlyProtectedPath", () => {
  it("marks business and platform areas as protected", () => {
    expect(isExplicitlyProtectedPath("/business/invoices")).toBe(true);
    expect(isExplicitlyProtectedPath("/platform/dashboard")).toBe(true);
  });

  it("does not mark public routes as protected", () => {
    expect(isExplicitlyProtectedPath("/invoice/token")).toBe(false);
    expect(isExplicitlyProtectedPath("/book/slug")).toBe(false);
  });
});
