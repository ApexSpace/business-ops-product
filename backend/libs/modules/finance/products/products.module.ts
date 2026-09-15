import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { ProductBundlesController } from './controllers/product-bundles.controller';
import { ProductCategoriesController } from './controllers/product-categories.controller';
import { ProductImagesController } from './controllers/product-images.controller';
import { ProductInventoryController } from './controllers/product-inventory.controller';
import { ProductOptionsController } from './controllers/product-options.controller';
import { ProductVariantsController } from './controllers/product-variants.controller';
import { ProductsController } from './controllers/products.controller';
import { ProductBundleRepository } from './repositories/product-bundle.repository';
import { ProductCategoryRepository } from './repositories/product-category.repository';
import { ProductImageRepository } from './repositories/product-image.repository';
import { ProductInventoryRepository } from './repositories/product-inventory.repository';
import { ProductOptionRepository } from './repositories/product-option.repository';
import { ProductVariantRepository } from './repositories/product-variant.repository';
import { ProductRepository } from './repositories/product.repository';
import { ProductBundlesService } from './services/product-bundles.service';
import { ProductCategoriesService } from './services/product-categories.service';
import { ProductExportService } from './services/product-export.service';
import { ProductImagesService } from './services/product-images.service';
import { ProductInventoryService } from './services/product-inventory.service';
import { ProductOptionsService } from './services/product-options.service';
import { ProductPickerService } from './services/product-picker.service';
import { ProductVariantRegenerationService } from './services/product-variant-regeneration.service';
import { ProductVariantsService } from './services/product-variants.service';
import { ProductsService } from './services/products.service';

@Module({
  imports: [AuditModule, forwardRef(() => BusinessModule), StorageModule],
  controllers: [
    ProductCategoriesController,
    ProductsController,
    ProductOptionsController,
    ProductVariantsController,
    ProductImagesController,
    ProductInventoryController,
    ProductBundlesController,
  ],
  providers: [
    ProductRepository,
    ProductCategoryRepository,
    ProductVariantRepository,
    ProductOptionRepository,
    ProductImageRepository,
    ProductInventoryRepository,
    ProductBundleRepository,
    ProductCategoriesService,
    ProductsService,
    ProductOptionsService,
    ProductVariantsService,
    ProductInventoryService,
    ProductImagesService,
    ProductExportService,
    ProductBundlesService,
    ProductPickerService,
    ProductVariantRegenerationService,
  ],
  exports: [
    ProductRepository,
    ProductVariantRepository,
    ProductInventoryService,
    ProductPickerService,
  ],
})
export class ProductsModule {}
