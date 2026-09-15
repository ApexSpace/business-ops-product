import { Module } from '@nestjs/common';
import { CoreModule } from '@app/core/core.module';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { DataIoController } from './controllers/data-io.controller';
import { DataImportJobRepository } from './repositories/data-import-job.repository';
import { DataImportService } from './services/data-import.service';
import { DataExportService } from './services/data-export.service';
import { ContactEntityHandlerService } from './entities/contact-entity-handler.service';
import { CatalogEntityHandlersService } from './entities/catalog-entity-handlers.service';
import { SecondaryEntityHandlersService } from './entities/secondary-entity-handlers.service';
import { ProcessDataImportProcessor } from './workers/processors/process-data-import.processor';

@Module({
  imports: [CoreModule, AuditModule, ContactsModule, StorageModule],
  controllers: [DataIoController],
  providers: [
    DataImportJobRepository,
    DataImportService,
    DataExportService,
    ContactEntityHandlerService,
    CatalogEntityHandlersService,
    SecondaryEntityHandlersService,
    ProcessDataImportProcessor,
  ],
  exports: [
    DataImportService,
    DataExportService,
    ProcessDataImportProcessor,
    ContactEntityHandlerService,
    CatalogEntityHandlersService,
    SecondaryEntityHandlersService,
  ],
})
export class DataIoModule {}
