export const DATA_IMPORT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const DATA_IMPORT_MAX_ROWS = 100_000;
export const DATA_IMPORT_PREVIEW_ROWS = 50;
export const DATA_IMPORT_BATCH_SIZE = 100;
export const DATA_IMPORT_APPEND_TO_NOTES = '__append_to_notes__';
export const DATA_IMPORT_SKIP = '__skip__';

export type ColumnMappingAction =
  | { kind: 'field'; field: string }
  | { kind: 'skip' }
  | { kind: 'append_to_notes' };

export type ColumnMappingEntry = {
  sourceColumn: string;
  target: string | null;
  action: 'map' | 'skip' | 'append_to_notes';
};

export type DataImportStats = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  processed: number;
};

export type DataImportOptions = {
  duplicatePolicy?: 'SKIP' | 'UPDATE' | 'CREATE_ALWAYS';
  providerPreset?: string;
  timezoneDefault?: string;
  restoreDeleted?: boolean;
  autoCreateTags?: boolean;
  dateFormat?: 'MDY' | 'DMY' | 'YMD';
  suppressNotifications?: boolean;
};

export type FieldDefinition = {
  key: string;
  label: string;
  aliases: string[];
  required?: boolean;
};

export type ParsedTabular = {
  headers: string[];
  rows: Record<string, string>[];
  format: 'csv' | 'xlsx' | 'xls' | 'txt';
  sheetNames?: string[];
  warnings: string[];
};
