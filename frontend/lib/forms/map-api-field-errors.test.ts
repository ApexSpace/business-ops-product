import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/errors";
import { mapApiFieldErrorsToForm } from "./map-api-field-errors";

describe("mapApiFieldErrorsToForm", () => {
  it("maps ApiClientError field errors to setError", () => {
    const setError = vi.fn();
    const err = new ApiClientError("Validation failed", 400, {
      code: "VALIDATION_ERROR",
      fieldErrors: { email: ["Required"] },
    });

    const mapped = mapApiFieldErrorsToForm(err, setError);

    expect(mapped).toBe(true);
    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "Required",
    });
  });

  it("returns false when no field errors", () => {
    const setError = vi.fn();
    const mapped = mapApiFieldErrorsToForm(new Error("nope"), setError);
    expect(mapped).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
