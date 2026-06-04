import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiClientError, FieldErrors } from "@/lib/api/errors";

export function mapApiFieldErrorsToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  const fieldErrors = extractFieldErrorsFromError(error);
  if (!fieldErrors) return false;

  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (message) {
      setError(field as Path<T>, { type: "server", message });
    }
  }
  return true;
}

export function extractFieldErrorsFromError(
  error: unknown,
): FieldErrors | undefined {
  if (error instanceof Error && "fieldErrors" in error) {
    return (error as ApiClientError).fieldErrors;
  }
  return undefined;
}
