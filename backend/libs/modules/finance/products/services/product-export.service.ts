import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';

@Injectable()
export class ProductExportService {
  constructor(private readonly productRepository: ProductRepository) {}

  async exportCsv(businessId: string): Promise<string> {
    const products = await this.productRepository.findManyForExport(businessId);
    const header = [
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

    return `\uFEFF${[header.join(','), ...rows.map((row) => row.join(','))].join('\r\n')}`;
  }

  private escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
