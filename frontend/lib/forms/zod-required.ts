import { z } from "zod";

function getObjectShape(
  schema: z.ZodTypeAny,
): Record<string, z.ZodTypeAny> | null {
  if (!schema || typeof schema !== "object") return null;
  if (schema instanceof z.ZodObject) {
    return schema.shape;
  }
  return null;
}

function resolveFieldSchema(
  root: z.ZodTypeAny,
  path: string,
): z.ZodTypeAny | undefined {
  if (!path) return undefined;
  const segments = path.split(".");
  let current: z.ZodTypeAny = root;

  for (const segment of segments) {
    const shape = getObjectShape(current);
    if (!shape?.[segment]) {
      return undefined;
    }
    current = shape[segment];
  }

  return current;
}

/** Whether a Zod object field should show the required asterisk in forms. */
export function isZodFieldRequired(
  schema: z.ZodTypeAny,
  path: string,
): boolean {
  if (!schema || !path) return false;
  const field = resolveFieldSchema(schema, path);
  if (!field) {
    return false;
  }
  return !field.isOptional();
}
