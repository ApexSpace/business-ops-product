import { Injectable } from '@nestjs/common';
import { DataImportEntityType } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { HttpStatus } from '@nestjs/common';
import { getEntityHandler } from '../entities/entity-registry';
import { buildCsv } from '../mapping/row-utils';

@Injectable()
export class DataExportService {
  async exportCsv(
    businessId: string,
    entityType: DataImportEntityType,
    filters?: { search?: string },
  ): Promise<{ filename: string; csv: string }> {
    const handler = getEntityHandler(entityType);
    if (!handler?.supportsExport) {
      throw new AppException(
        ErrorCode.DATA_EXPORT_UNSUPPORTED,
        `Export is not supported for ${entityType}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const rows = await handler.exportRows(businessId, filters);
    const csv = buildCsv(handler.exportHeaders, rows);
    const filename = `${entityType.toLowerCase()}-export.csv`;
    return { filename, csv };
  }
}
