import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DataImportDuplicatePolicy,
  DataImportEntityType,
  ProductStatus,
  ProductType,
  ServiceStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { coerceBoolean, coerceMoney } from '../mapping/row-utils';
import {
  registerEntityHandler,
  type EntityHandler,
  type EntityImportContext,
  type ImportRowResult,
} from './entity-registry';
import type { FieldDefinition } from '../constants/data-io.constants';

const SERVICE_FIELDS: FieldDefinition[] = [
  { key: 'id', label: 'ID', aliases: ['id', 'service_id'] },
  { key: 'name', label: 'Name', aliases: ['name', 'service_name', 'title'] },
  {
    key: 'categoryName',
    label: 'Category',
    aliases: ['category', 'category_name', 'service_category'],
  },
  {
    key: 'durationMinutes',
    label: 'Duration (minutes)',
    aliases: ['duration', 'duration_minutes', 'minutes'],
  },
  {
    key: 'price',
    label: 'Price',
    aliases: ['price', 'amount', 'cost'],
  },
  {
    key: 'description',
    label: 'Description',
    aliases: ['description', 'details'],
  },
  {
    key: 'status',
    label: 'Status',
    aliases: ['status', 'active'],
  },
];

const PRODUCT_FIELDS: FieldDefinition[] = [
  { key: 'id', label: 'ID', aliases: ['id', 'product_id'] },
  { key: 'name', label: 'Name', aliases: ['name', 'product_name'] },
  {
    key: 'productType',
    label: 'Product Type',
    aliases: ['product_type', 'type'],
  },
  {
    key: 'categoryName',
    label: 'Category',
    aliases: ['category', 'category_name'],
  },
  { key: 'brand', label: 'Brand', aliases: ['brand'] },
  {
    key: 'unitPrice',
    label: 'Unit Price',
    aliases: ['unit_price', 'price'],
  },
  { key: 'sku', label: 'SKU', aliases: ['sku'] },
  { key: 'barcode', label: 'Barcode', aliases: ['barcode'] },
  {
    key: 'stockQuantity',
    label: 'Stock Quantity',
    aliases: ['stock', 'stock_quantity', 'quantity'],
  },
  {
    key: 'trackInventory',
    label: 'Track Inventory',
    aliases: ['track_inventory', 'track_stock'],
  },
  { key: 'status', label: 'Status', aliases: ['status'] },
];

@Injectable()
export class CatalogEntityHandlersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    registerEntityHandler(this.serviceHandler());
    registerEntityHandler(this.productHandler());
  }

  private serviceHandler(): EntityHandler {
    return {
      entityType: DataImportEntityType.SERVICE,
      fields: SERVICE_FIELDS,
      supportsImport: true,
      supportsExport: true,
      templateHeaders: [
        'name',
        'categoryName',
        'durationMinutes',
        'price',
        'description',
        'status',
      ],
      exportHeaders: [
        'ID',
        'Name',
        'Category',
        'Duration (minutes)',
        'Price',
        'Description',
        'Status',
      ],
      importRow: (mapped, _notes, ctx) => this.importService(mapped, ctx),
      exportRows: async (businessId) => {
        const items = await this.prisma.service.findMany({
          where: { businessId, deletedAt: null },
          include: { category: true },
          orderBy: { name: 'asc' },
          take: 100_000,
        });
        return items.map((s) => [
          s.id,
          s.name,
          s.category?.name ?? '',
          String(s.durationMinutes ?? ''),
          s.price?.toString() ?? '',
          s.description ?? '',
          s.status,
        ]);
      },
    };
  }

  private productHandler(): EntityHandler {
    return {
      entityType: DataImportEntityType.PRODUCT,
      fields: PRODUCT_FIELDS,
      supportsImport: true,
      supportsExport: true,
      templateHeaders: [
        'name',
        'productType',
        'categoryName',
        'brand',
        'unitPrice',
        'sku',
        'barcode',
        'stockQuantity',
        'trackInventory',
        'status',
      ],
      exportHeaders: [
        'ID',
        'Name',
        'Product type',
        'Category',
        'Brand',
        'Unit price',
        'SKU',
        'Barcode',
        'Stock quantity',
        'Track inventory',
        'Status',
      ],
      importRow: (mapped, _notes, ctx) => this.importProduct(mapped, ctx),
      exportRows: async (businessId) => {
        const items = await this.prisma.product.findMany({
          where: { businessId, deletedAt: null },
          include: { category: true },
          orderBy: { name: 'asc' },
          take: 100_000,
        });
        return items.map((p) => [
          p.id,
          p.name,
          p.productType,
          p.category?.name ?? '',
          p.brand ?? '',
          p.unitPrice.toString(),
          p.sku ?? '',
          p.barcode ?? '',
          String(p.stockQuantity),
          p.trackInventory ? 'true' : 'false',
          p.status,
        ]);
      },
    };
  }

  private async importService(
    mapped: Record<string, string>,
    ctx: EntityImportContext,
  ): Promise<ImportRowResult> {
    const name = mapped.name?.trim();
    if (!name) {
      return { status: 'failed', reason: 'Service name is required', row: mapped };
    }
    const price = mapped.price ? coerceMoney(mapped.price) : 0;
    const duration = mapped.durationMinutes
      ? Number.parseInt(mapped.durationMinutes, 10)
      : 60;
    if (price == null || Number.isNaN(duration)) {
      return {
        status: 'failed',
        reason: 'Invalid price or duration',
        row: mapped,
      };
    }

    let categoryId: string | undefined;
    const categoryName = mapped.categoryName?.trim() || 'Imported';
    {
      const existingCat = await this.prisma.serviceCategory.findFirst({
        where: {
          businessId: ctx.businessId,
          name: { equals: categoryName, mode: 'insensitive' },
          deletedAt: null,
        },
      });
      if (existingCat) categoryId = existingCat.id;
      else {
        const created = await this.prisma.serviceCategory.create({
          data: {
            businessId: ctx.businessId,
            name: categoryName,
          },
        });
        categoryId = created.id;
      }
    }

    const existing = mapped.id
      ? await this.prisma.service.findFirst({
          where: { id: mapped.id, businessId: ctx.businessId, deletedAt: null },
        })
      : await this.prisma.service.findFirst({
          where: {
            businessId: ctx.businessId,
            deletedAt: null,
            name: { equals: name, mode: 'insensitive' },
          },
        });

    const statusRaw = mapped.status?.trim().toUpperCase();
    const status =
      statusRaw === 'ARCHIVED' ||
      statusRaw === 'INACTIVE' ||
      statusRaw === 'DISABLED'
        ? ServiceStatus.ARCHIVED
        : ServiceStatus.ACTIVE;

    if (existing) {
      if (ctx.duplicatePolicy === DataImportDuplicatePolicy.SKIP) {
        return { status: 'skipped', reason: 'service already exists' };
      }
      if (ctx.duplicatePolicy !== DataImportDuplicatePolicy.CREATE_ALWAYS) {
        await this.prisma.service.update({
          where: { id: existing.id },
          data: {
            name,
            durationMinutes: duration,
            price,
            description: mapped.description?.trim() || existing.description,
            status,
            categoryId,
          },
        });
        return { status: 'updated', id: existing.id };
      }
    }

    const created = await this.prisma.service.create({
      data: {
        businessId: ctx.businessId,
        categoryId: categoryId!,
        name,
        durationMinutes: duration,
        price,
        description: mapped.description?.trim() || null,
        status,
      },
    });
    return { status: 'created', id: created.id };
  }

  private async importProduct(
    mapped: Record<string, string>,
    ctx: EntityImportContext,
  ): Promise<ImportRowResult> {
    const name = mapped.name?.trim();
    if (!name) {
      return { status: 'failed', reason: 'Product name is required', row: mapped };
    }
    const unitPrice = mapped.unitPrice ? coerceMoney(mapped.unitPrice) : 0;
    if (unitPrice == null) {
      return { status: 'failed', reason: 'Invalid unit price', row: mapped };
    }

    let categoryId: string | undefined;
    if (mapped.categoryName?.trim()) {
      const existingCat = await this.prisma.productCategory.findFirst({
        where: {
          businessId: ctx.businessId,
          name: { equals: mapped.categoryName.trim(), mode: 'insensitive' },
          deletedAt: null,
        },
      });
      if (existingCat) categoryId = existingCat.id;
      else {
        const created = await this.prisma.productCategory.create({
          data: {
            businessId: ctx.businessId,
            name: mapped.categoryName.trim(),
          },
        });
        categoryId = created.id;
      }
    }

    const sku = mapped.sku?.trim() || null;
    let existing = mapped.id
      ? await this.prisma.product.findFirst({
          where: { id: mapped.id, businessId: ctx.businessId, deletedAt: null },
        })
      : null;
    if (!existing && sku) {
      existing = await this.prisma.product.findFirst({
        where: { businessId: ctx.businessId, deletedAt: null, sku },
      });
    }
    if (!existing) {
      existing = await this.prisma.product.findFirst({
        where: {
          businessId: ctx.businessId,
          deletedAt: null,
          name: { equals: name, mode: 'insensitive' },
        },
      });
    }

    const productTypeRaw = (mapped.productType ?? 'SIMPLE').toUpperCase();
    const productType =
      productTypeRaw in ProductType
        ? (productTypeRaw as ProductType)
        : ProductType.SIMPLE;
    const trackInventory =
      mapped.trackInventory != null
        ? (coerceBoolean(mapped.trackInventory) ?? true)
        : true;
    const stockQuantity = mapped.stockQuantity
      ? Number.parseInt(mapped.stockQuantity, 10) || 0
      : 0;
    const statusRaw = mapped.status?.trim().toUpperCase();
    const status =
      statusRaw === 'INACTIVE' || statusRaw === 'ARCHIVED'
        ? ProductStatus.ARCHIVED
        : ProductStatus.ACTIVE;

    if (existing) {
      if (ctx.duplicatePolicy === DataImportDuplicatePolicy.SKIP) {
        return { status: 'skipped', reason: 'product already exists' };
      }
      if (ctx.duplicatePolicy !== DataImportDuplicatePolicy.CREATE_ALWAYS) {
        await this.prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            productType,
            brand: mapped.brand?.trim() || existing.brand,
            unitPrice,
            sku: sku ?? existing.sku,
            barcode: mapped.barcode?.trim() || existing.barcode,
            stockQuantity,
            trackInventory,
            status,
            ...(categoryId ? { categoryId } : {}),
          },
        });
        return { status: 'updated', id: existing.id };
      }
    }

    const created = await this.prisma.product.create({
      data: {
        businessId: ctx.businessId,
        name,
        productType,
        brand: mapped.brand?.trim() || null,
        unitPrice,
        sku,
        barcode: mapped.barcode?.trim() || null,
        stockQuantity,
        trackInventory,
        status,
        ...(categoryId ? { categoryId } : {}),
      },
    });
    return { status: 'created', id: created.id };
  }
}
