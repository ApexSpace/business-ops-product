import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { NotificationsModule } from '@app/modules/communications/notifications/notifications.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { ClientPackagesController } from './controllers/client-packages.controller';
import { PackageSettingsController } from './controllers/package-settings.controller';
import { PackageTemplatesController } from './controllers/package-templates.controller';
import { PackagesPublicController } from './controllers/packages-public.controller';
import { ClientPackageRepository } from './repositories/client-package.repository';
import { PackageSettingsRepository } from './repositories/package-settings.repository';
import { PackageTemplateRepository } from './repositories/package-template.repository';
import { ClientPackagesService } from './services/client-packages.service';
import { PackageEmailService } from './services/package-email.service';
import { PackageOnlineCheckoutService } from './services/package-online-checkout.service';
import { PackageSalesService } from './services/package-sales.service';
import { PackageSettingsService } from './services/package-settings.service';
import { PackageTemplatesService } from './services/package-templates.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [
    PackageTemplatesController,
    ClientPackagesController,
    PackageSettingsController,
    PackagesPublicController,
  ],
  providers: [
    PackageTemplateRepository,
    ClientPackageRepository,
    PackageSettingsRepository,
    PackageTemplatesService,
    ClientPackagesService,
    PackageSettingsService,
    PackageEmailService,
    PackageOnlineCheckoutService,
    PackageSalesService,
  ],
  exports: [
    PackageTemplateRepository,
    ClientPackagesService,
    PackageTemplatesService,
    PackageSettingsService,
    PackageOnlineCheckoutService,
    PackageSalesService,
  ],
})
export class PackagesModule {}
