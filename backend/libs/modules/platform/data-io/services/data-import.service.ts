import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DataImportDuplicatePolicy,
  DataImportEntityType,
  DataImportJobStatus,
  FileAssetStatus,
  FileCategory,
  FileVisibility,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { FileAssetRepository } from '@app/modules/storage/repositories/file-asset.repository';
import { StorageService } from '@app/modules/storage/services/storage.service';
import {
  DATA_IMPORT_BATCH_SIZE,
  DATA_IMPORT_PREVIEW_ROWS,
  type ColumnMappingEntry,
  type DataImportOptions,
  type DataImportStats,
} from '../constants/data-io.constants';
import { DataImportJobRepository } from '../repositories/data-import-job.repository';
import { parseTabularFile } from '../parsers/parse-tabular';
import { applyProviderAliases, inferColumnMappings } from '../mapping/infer-mappings';
import { applyRowMapping, buildCsv } from '../mapping/row-utils';
import {
  getEntityHandler,
  listEntityHandlers,
} from '../entities/entity-registry';
import type {
  AttachDataImportFileDto,
  ConfigureDataImportDto,
  CreateDataImportDto,
} from '../dto/data-import.dto';

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private readonly jobs: DataImportJobRepository,
    private readonly fileAssets: FileAssetRepository,
    private readonly storage: StorageService,
    private readonly jobEnqueue: JobEnqueueService,
    private readonly audit: AuditService,
  ) {}

  listEntities() {
    return listEntityHandlers().map((h) => ({
      entityType: h.entityType,
      supportsImport: h.supportsImport,
      supportsExport: h.supportsExport,
      fields: h.fields.map((f) => ({ key: f.key, label: f.label })),
      templateHeaders: h.templateHeaders,
    }));
  }

  async createDraft(
    businessId: string,
    dto: CreateDataImportDto,
    actor: RequestUser,
  ) {
    const handler = getEntityHandler(dto.entityType);
    if (!handler?.supportsImport) {
      throw new AppException(
        ErrorCode.DATA_EXPORT_UNSUPPORTED,
        `Import is not supported for ${dto.entityType}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const active = await this.jobs.findActiveForEntity(
      businessId,
      dto.entityType,
    );
    if (active) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_IN_PROGRESS,
        `An import for ${dto.entityType} is already in progress`,
        HttpStatus.CONFLICT,
      );
    }

    const job = await this.jobs.create({
      business: { connect: { id: businessId } },
      entityType: dto.entityType,
      status: DataImportJobStatus.DRAFT,
      options: {
        providerPreset: dto.providerPreset,
        timezoneDefault: dto.timezoneDefault,
        duplicatePolicy: DataImportDuplicatePolicy.UPDATE,
        autoCreateTags: true,
      } satisfies DataImportOptions,
      createdBy: { connect: { id: actor.id } },
    });

    return this.toResponse(job);
  }

  async attachFile(
    businessId: string,
    id: string,
    dto: AttachDataImportFileDto,
  ) {
    const job = await this.requireJob(businessId, id);
    if (
      job.status !== DataImportJobStatus.DRAFT &&
      job.status !== DataImportJobStatus.UPLOADED
    ) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_INVALID_STATE,
        'File can only be attached to a draft import',
        HttpStatus.BAD_REQUEST,
      );
    }

    const asset = await this.fileAssets.findById(businessId, dto.fileAssetId);
    if (!asset || asset.status !== FileAssetStatus.READY) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_INVALID_FILE,
        'Upload a ready CSV or Excel file first',
        HttpStatus.BAD_REQUEST,
      );
    }

    const buffer = await this.storage.getObjectBytes(asset.objectKey);
    const parsed = await parseTabularFile({
      buffer,
      mimeType: asset.mimeType,
      fileName: asset.originalName,
      sheetName: dto.sheetName,
      headerRowNumber: dto.headerRowNumber,
      maxRows: DATA_IMPORT_PREVIEW_ROWS,
    });

    const handler = getEntityHandler(job.entityType)!;
    const options = (job.options ?? {}) as DataImportOptions;
    const fieldDefs = options.providerPreset
      ? applyProviderAliases(
          parsed.headers,
          handler.fields,
          handler.providerAliases?.[options.providerPreset] ?? {},
        )
      : handler.fields;

    const inferred = inferColumnMappings(parsed.headers, fieldDefs);

    const updated = await this.jobs.update(job.id, {
      status: DataImportJobStatus.UPLOADED,
      fileAsset: { connect: { id: asset.id } },
      sheetName: dto.sheetName ?? parsed.sheetNames?.[0] ?? null,
      headerRowNumber: dto.headerRowNumber ?? 1,
      mapping: inferred as unknown as Prisma.InputJsonValue,
      warnings: [
        ...parsed.warnings,
        ...(parsed.formatMismatch
          ? ['Detected file format differs from file extension/MIME type.']
          : []),
      ] as unknown as Prisma.InputJsonValue,
    });

    return {
      ...this.toResponse(updated),
      preview: {
        format: parsed.format,
        headers: parsed.headers,
        sheetNames: parsed.sheetNames ?? [],
        sampleRows: parsed.rows.slice(0, DATA_IMPORT_PREVIEW_ROWS),
        inferredMapping: inferred,
        fields: handler.fields.map((f) => ({ key: f.key, label: f.label })),
      },
    };
  }

  async configure(
    businessId: string,
    id: string,
    dto: ConfigureDataImportDto,
  ) {
    const job = await this.requireJob(businessId, id);
    if (
      job.status !== DataImportJobStatus.UPLOADED &&
      job.status !== DataImportJobStatus.MAPPED
    ) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_INVALID_STATE,
        'Configure mapping after uploading a file',
        HttpStatus.BAD_REQUEST,
      );
    }

    const options: DataImportOptions = {
      ...((job.options as DataImportOptions) ?? {}),
      duplicatePolicy:
        dto.duplicatePolicy ?? DataImportDuplicatePolicy.UPDATE,
      providerPreset: dto.providerPreset,
      timezoneDefault: dto.timezoneDefault,
      restoreDeleted: dto.restoreDeleted,
      autoCreateTags: dto.autoCreateTags ?? true,
    };

    const updated = await this.jobs.update(job.id, {
      status: DataImportJobStatus.MAPPED,
      mapping: dto.mapping as unknown as Prisma.InputJsonValue,
      options: options as unknown as Prisma.InputJsonValue,
      ...(dto.sheetName !== undefined ? { sheetName: dto.sheetName } : {}),
      ...(dto.headerRowNumber !== undefined
        ? { headerRowNumber: dto.headerRowNumber }
        : {}),
    });

    return this.toResponse(updated);
  }

  async start(businessId: string, id: string, actor: RequestUser) {
    const job = await this.requireJob(businessId, id);
    if (job.status !== DataImportJobStatus.MAPPED) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_INVALID_STATE,
        'Map columns before starting the import',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!job.fileAssetId) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_INVALID_FILE,
        'No file attached',
        HttpStatus.BAD_REQUEST,
      );
    }

    const asyncJob = await this.jobEnqueue.enqueueDataImport({
      businessId,
      dataImportJobId: job.id,
      actorUserId: actor.id,
    });

    const updated = await this.jobs.update(job.id, {
      status: DataImportJobStatus.VALIDATING,
      asyncJob: { connect: { id: asyncJob.id } },
    });

    await this.audit.log({
      actorUserId: actor.id,
      businessId,
      action: 'data_import.started',
      entityType: 'DataImportJob',
      entityId: job.id,
      metadata: { entityType: job.entityType },
    });

    return {
      ...this.toResponse(updated),
      asyncJobId: asyncJob.id,
    };
  }

  async get(businessId: string, id: string) {
    const job = await this.requireJob(businessId, id);
    return this.toResponse(job);
  }

  async list(
    businessId: string,
    query: { page?: number; limit?: number; entityType?: DataImportEntityType },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.jobs.list(businessId, {
      page,
      limit,
      entityType: query.entityType,
    });
    return {
      items: result.items.map((j) => this.toResponse(j)),
      meta: { total: result.total, page, limit },
    };
  }

  getTemplate(entityType: DataImportEntityType): string {
    const handler = getEntityHandler(entityType);
    if (!handler) {
      throw new AppException(
        ErrorCode.DATA_EXPORT_UNSUPPORTED,
        `Unknown entity ${entityType}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return buildCsv(handler.templateHeaders, []);
  }

  async processImportJob(params: {
    businessId: string;
    dataImportJobId: string;
    actorUserId: string;
  }): Promise<Record<string, unknown>> {
    const job = await this.requireJob(
      params.businessId,
      params.dataImportJobId,
    );
    const handler = getEntityHandler(job.entityType);
    if (!handler?.supportsImport) {
      throw new Error(`No import handler for ${job.entityType}`);
    }
    if (!job.fileAssetId) {
      throw new Error('Missing file asset');
    }

    await this.jobs.update(job.id, {
      status: DataImportJobStatus.IMPORTING,
      stats: {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        processed: 0,
      } satisfies DataImportStats,
    });

    const asset = await this.fileAssets.findById(
      params.businessId,
      job.fileAssetId,
    );
    if (!asset) throw new Error('File asset not found');

    const buffer = await this.storage.getObjectBytes(asset.objectKey);
    const parsed = await parseTabularFile({
      buffer,
      mimeType: asset.mimeType,
      fileName: asset.originalName,
      sheetName: job.sheetName,
      headerRowNumber: job.headerRowNumber,
    });

    const mapping = (job.mapping ?? []) as ColumnMappingEntry[];
    const options = (job.options ?? {}) as DataImportOptions;
    const duplicatePolicy =
      options.duplicatePolicy ?? DataImportDuplicatePolicy.UPDATE;

    const stats: DataImportStats = {
      total: parsed.rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      processed: 0,
    };
    const errorRows: string[][] = [
      ['row', 'reason', ...parsed.headers],
    ];

    // Intra-file identity tracking for contacts-like entities
    const seenKeys = new Set<string>();

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const { fields, appendNotes } = applyRowMapping(row, mapping);

      const identityKey = [
        fields.id,
        fields.email?.toLowerCase(),
        fields.phone || fields.phoneNumber,
        fields.name,
        fields.title,
        fields.fullName,
      ]
        .filter(Boolean)
        .join('|');

      let effectivePolicy = duplicatePolicy;
      if (identityKey && seenKeys.has(identityKey)) {
        if (duplicatePolicy === DataImportDuplicatePolicy.CREATE_ALWAYS) {
          // still create
        } else {
          effectivePolicy = DataImportDuplicatePolicy.UPDATE;
        }
      }
      if (identityKey) seenKeys.add(identityKey);

      try {
        const result = await handler.importRow(
          fields,
          appendNotes,
          {
            businessId: params.businessId,
            actorUserId: params.actorUserId,
            duplicatePolicy: effectivePolicy,
            timezoneDefault: options.timezoneDefault,
            restoreDeleted: options.restoreDeleted,
            autoCreateTags: options.autoCreateTags,
            providerPreset: options.providerPreset,
            suppressNotifications: options.suppressNotifications,
          },
          mapping,
        );

        if (result.status === 'created') stats.created += 1;
        else if (result.status === 'updated') stats.updated += 1;
        else if (result.status === 'skipped') {
          stats.skipped += 1;
          errorRows.push([
            String(i + 1),
            result.reason,
            ...parsed.headers.map((h) => row[h] ?? ''),
          ]);
        } else {
          stats.failed += 1;
          errorRows.push([
            String(i + 1),
            result.reason,
            ...parsed.headers.map((h) => row[h] ?? ''),
          ]);
        }
      } catch (error) {
        stats.failed += 1;
        const reason =
          error instanceof Error ? error.message : 'Unexpected row error';
        this.logger.warn(`Import row ${i + 1} failed: ${reason}`);
        errorRows.push([
          String(i + 1),
          reason,
          ...parsed.headers.map((h) => row[h] ?? ''),
        ]);
      }

      stats.processed += 1;
      if (stats.processed % DATA_IMPORT_BATCH_SIZE === 0) {
        await this.jobs.update(job.id, {
          stats: stats as unknown as Prisma.InputJsonValue,
        });
      }
    }

    let errorReportAssetId: string | undefined;
    if (errorRows.length > 1) {
      const csv = buildCsv(errorRows[0], errorRows.slice(1));
      const uploaded = await this.storage.putGeneratedFile({
        businessId: params.businessId,
        uploadedById: params.actorUserId,
        auditActorUserId: params.actorUserId,
        fileName: `import-errors-${job.id}.csv`,
        mimeType: 'text/csv',
        category: FileCategory.DOCUMENT,
        visibility: FileVisibility.PRIVATE,
        buffer: Buffer.from(csv, 'utf8'),
      });
      errorReportAssetId = uploaded.fileAssetId;
    }

    const finalStatus =
      stats.failed > 0
        ? DataImportJobStatus.COMPLETED_WITH_ERRORS
        : DataImportJobStatus.COMPLETED;

    await this.jobs.update(job.id, {
      status: finalStatus,
      stats: stats as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
      ...(errorReportAssetId
        ? { errorReportAsset: { connect: { id: errorReportAssetId } } }
        : {}),
    });

    await this.audit.log({
      actorUserId: params.actorUserId,
      businessId: params.businessId,
      action: 'data_import.completed',
      entityType: 'DataImportJob',
      entityId: job.id,
      metadata: { ...stats, status: finalStatus },
    });

    return { ...stats, status: finalStatus, errorReportAssetId };
  }

  private async requireJob(businessId: string, id: string) {
    const job = await this.jobs.findById(businessId, id);
    if (!job) {
      throw new AppException(
        ErrorCode.DATA_IMPORT_NOT_FOUND,
        'Import job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return job;
  }

  private toResponse(job: {
    id: string;
    businessId: string;
    entityType: DataImportEntityType;
    status: DataImportJobStatus;
    fileAssetId: string | null;
    errorReportAssetId: string | null;
    asyncJobId: string | null;
    mapping: Prisma.JsonValue;
    options: Prisma.JsonValue;
    stats: Prisma.JsonValue;
    warnings: Prisma.JsonValue;
    sheetName: string | null;
    headerRowNumber: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      businessId: job.businessId,
      entityType: job.entityType,
      status: job.status,
      fileAssetId: job.fileAssetId,
      errorReportAssetId: job.errorReportAssetId,
      asyncJobId: job.asyncJobId,
      mapping: job.mapping,
      options: job.options,
      stats: job.stats,
      warnings: job.warnings,
      sheetName: job.sheetName,
      headerRowNumber: job.headerRowNumber,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }
}
