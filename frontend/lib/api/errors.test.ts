import { describe, expect, it } from "vitest";
import { ApiClientError } from "./errors";
import { parseApiError } from "./envelope";

describe("parseApiError", () => {
  it("extracts requestId and field errors", () => {
    const err = parseApiError(
      {
        data: null,
        meta: { requestId: "err-1" },
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid",
          details: [{ field: "email", messages: ["Invalid email"] }],
        },
      },
      400,
    );

    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.requestId).toBe("err-1");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.fieldErrors?.email).toEqual(["Invalid email"]);
  });
});
