import { Module } from '@nestjs/common';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { BusinessFormsController } from './controllers/business-forms.controller';
import { FormWidgetsController } from './controllers/form-widgets.controller';
import { PublicFormsController } from './controllers/public-forms.controller';
import { FormSubmissionsRepository } from './repositories/form-submissions.repository';
import { FormsRepository } from './repositories/forms.repository';
import { FormEmbedService } from './services/form-embed.service';
import { FormWidgetPageService } from './services/form-widget-page.service';
import { FormSubmissionsService } from './services/form-submissions.service';
import { FormsService } from './services/forms.service';
import { PublicFormsService } from './services/public-forms.service';

@Module({
  imports: [BusinessModule],
  controllers: [
    BusinessFormsController,
    PublicFormsController,
    FormWidgetsController,
  ],
  providers: [
    FormsRepository,
    FormSubmissionsRepository,
    FormsService,
    FormSubmissionsService,
    FormEmbedService,
    FormWidgetPageService,
    PublicFormsService,
  ],
  exports: [FormsRepository, FormsService, PublicFormsService],
})
export class FormsModule {}
