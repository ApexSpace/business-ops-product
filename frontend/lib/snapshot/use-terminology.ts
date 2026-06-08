"use client";

import { useCallback, useMemo } from "react";
import type {
  EntityLabelField,
  SnapshotEntityId,
} from "@/lib/config/snapshot/entity-label-registry";
import { useSnapshotContext } from "./use-snapshot-context";
import {
  createEntityLabelResolver,
  resolveTerminology,
} from "./resolve-terminology";

export function useTerminology() {
  const { context } = useSnapshotContext();

  const t = useCallback(
    (key: string, fallback: string) =>
      resolveTerminology(key, fallback, context.terminology),
    [context.terminology],
  );

  const tEntity = useCallback(
    (entity: SnapshotEntityId, field: EntityLabelField, fallback: string) =>
      createEntityLabelResolver(context.terminology)(entity, field, fallback),
    [context.terminology],
  );

  const entityResolver = useMemo(
    () => createEntityLabelResolver(context.terminology),
    [context.terminology],
  );

  return { t, tEntity, entityResolver, terminology: context.terminology };
}
