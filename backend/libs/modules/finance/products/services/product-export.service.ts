import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';

@Injectable()
export class ProductExportService {
  constructor(private readonly productRepository: ProductRepository) {}

  async exportCsv(businessId: string): Promise<string> {
    const products = await this.productRepository.findManyForExport(businessId);
    const header = [
      'id',
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
    ];

    const rows = products.map((product) => [
      product.id,
      this.escapeCsv(product.name),
      product.productType,
      this.escapeCsv(product.category?.name ?? ''),
      this.escapeCsv(product.brand ?? ''),
      product.unitPrice.toString(),
      this.escapeCsv(product.sku ?? ''),
      this.escapeCsv(product.barcode ?? ''),
      String(product.stockQuantity),
      product.trackInventory ? 'true' : 'false',
      product.status,
    ]);

    return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
