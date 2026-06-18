import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { FormMetadataController } from './controllers/form-metadata.controller';
import { BusinessFormsController } from './controllers/business-forms.controller';
import { FormWidgetsController } from './controllers/form-widgets.controller';
import { PublicFormsController } from './controllers/public-forms.controller';
import { FormSubmissionsRepository } from './repositories/form-submissions.repository';
import { FormsRepository } from './repositories/forms.repository';
import { FormEmbedService } from './services/form-embed.service';
import { FormWidgetPageService } from './services/form-widget-page.service';
import { FormSubmissionsService } from './services/form-submissions.service';
import { FormMetadataService } from './services/form-metadata.service';
import { FormsService } from './services/forms.service';
import { PublicFormsService } from './services/public-forms.service';

@Module({
  imports: [AuditModule, BusinessModule, StorageModule],
  controllers: [
    BusinessFormsController,
    FormMetadataController,
    PublicFormsController,
    FormWidgetsController,
  ],
  providers: [
    FormsRepository,
    FormSubmissionsRepository,
    FormMetadataService,
    FormsService,
    FormSubmissionsService,
    FormEmbedService,
    FormWidgetPageService,
    PublicFormsService,
  ],
  exports: [FormsRepository, FormsService, PublicFormsService],
})
export class FormsModule {}
