import type { DataImportDuplicatePolicy, DataImportEntityType } from '@prisma/client';
import type { FieldDefinition } from '../constants/data-io.constants';
import type { ColumnMappingEntry } from '../constants/data-io.constants';

export type ImportRowResult =
  | { status: 'created'; id: string }
  | { status: 'updated'; id: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string; row: Record<string, string> };

export type EntityImportContext = {
  businessId: string;
  actorUserId: string;
  duplicatePolicy: DataImportDuplicatePolicy;
  timezoneDefault?: string;
  restoreDeleted?: boolean;
  autoCreateTags?: boolean;
  providerPreset?: string;
  suppressNotifications?: boolean;
};

export type EntityHandler = {
  entityType: DataImportEntityType;
  fields: FieldDefinition[];
  providerAliases?: Record<string, Record<string, string[]>>;
  supportsImport: boolean;
  supportsExport: boolean;
  exportHeaders: string[];
  importRow: (
    mapped: Record<string, string>,
    appendNotes: string[],
    ctx: EntityImportContext,
    mapping: ColumnMappingEntry[],
  ) => Promise<ImportRowResult>;
  exportRows: (
    businessId: string,
    filters?: Record<string, string | undefined>,
  ) => Promise<string[][]>;
  templateHeaders: string[];
};

const handlers = new Map<DataImportEntityType, EntityHandler>();

export function registerEntityHandler(handler: EntityHandler): void {
  handlers.set(handler.entityType, handler);
}

export function getEntityHandler(
  entityType: DataImportEntityType,
): EntityHandler | undefined {
  return handlers.get(entityType);
}

export function listEntityHandlers(): EntityHandler[] {
  return [...handlers.values()];
}
