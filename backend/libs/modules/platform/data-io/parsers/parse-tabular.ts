import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  DATA_IMPORT_MAX_FILE_BYTES,
  DATA_IMPORT_MAX_ROWS,
  type ParsedTabular,
} from '../constants/data-io.constants';
import { detectFormatFromBytes } from './format-detector';
import { parseCsvOrTxt } from './csv-adapter';
import { parseExcelBuffer } from './excel-adapter';

export async function parseTabularFile(params: {
  buffer: Buffer;
  mimeType?: string | null;
  fileName?: string | null;
  sheetName?: string | null;
  headerRowNumber?: number;
  maxRows?: number;
}): Promise<ParsedTabular & { formatMismatch: boolean }> {
  if (params.buffer.length === 0) {
    throw new AppException(
      ErrorCode.DATA_IMPORT_INVALID_FILE,
      'File is empty.',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (params.buffer.length > DATA_IMPORT_MAX_FILE_BYTES) {
    throw new AppException(
      ErrorCode.DATA_IMPORT_INVALID_FILE,
      `File exceeds the ${Math.round(DATA_IMPORT_MAX_FILE_BYTES / (1024 * 1024))}MB limit. Split the file and try again.`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const detected = detectFormatFromBytes(
    params.buffer,
    params.mimeType,
    params.fileName,
  );

  if (detected.format === 'pdf') {
    throw new AppException(
      ErrorCode.DATA_IMPORT_INVALID_FILE,
      'PDF files are not supported. Export or convert to CSV or Excel first.',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (detected.format === 'unknown') {
    throw new AppException(
      ErrorCode.DATA_IMPORT_INVALID_FILE,
      'Could not detect file format. Upload a CSV or Excel (.xlsx) file.',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (detected.format === 'xls') {
    // exceljs does not reliably load legacy .xls — ask user to re-save.
    throw new AppException(
      ErrorCode.DATA_IMPORT_INVALID_FILE,
      'Legacy .xls files are not supported. Re-save as .xlsx or CSV in Excel and upload again.',
      HttpStatus.BAD_REQUEST,
    );
  }

  const maxRows = Math.min(
    params.maxRows ?? DATA_IMPORT_MAX_ROWS,
    DATA_IMPORT_MAX_ROWS,
  );

  try {
    if (detected.format === 'xlsx') {
      const parsed = await parseExcelBuffer(params.buffer, {
        sheetName: params.sheetName,
        headerRowNumber: params.headerRowNumber,
        maxRows,
        format: 'xlsx',
      });
      const warnings = [...parsed.warnings];
      if (detected.mismatch) {
        warnings.push(
          `File looks like Excel despite the declared type/extension. Imported as Excel.`,
        );
      }
      return { ...parsed, warnings, formatMismatch: detected.mismatch };
    }

    const parsed = parseCsvOrTxt(params.buffer, {
      headerRowNumber: params.headerRowNumber,
      maxRows,
      format: detected.format === 'txt' ? 'txt' : 'csv',
    });
    const warnings = [...parsed.warnings];
    if (detected.mismatch) {
      warnings.push(
        `File content was treated as CSV/text despite a different declared type.`,
      );
    }
    return { ...parsed, warnings, formatMismatch: detected.mismatch };
  } catch (error) {
    if (error instanceof AppException) throw error;
    const message =
      error instanceof Error ? error.message : 'Failed to parse import file.';
    throw new AppException(
      ErrorCode.DATA_IMPORT_INVALID_FILE,
      message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
