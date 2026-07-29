import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ConversationsModule } from '@app/modules/communications/conversations/conversations.module';
import { GiftCardsModule } from '@app/modules/finance/gift-cards/gift-cards.module';
import { MembershipsModule } from '@app/modules/finance/memberships/memberships.module';
import { PackagesModule } from '@app/modules/finance/packages/packages.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { ContactTagsController } from './controllers/contact-tags.controller';
import { ContactWorkspaceController } from './controllers/contact-workspace.controller';
import { ContactsController } from './controllers/contacts.controller';
import { PlatformContactsController } from './controllers/platform-contacts.controller';
import { ContactAdjustmentRepository } from './repositories/contact-adjustment.repository';
import { ContactRepository } from './repositories/contact.repository';
import { ContactWalletRepository } from './repositories/contact-wallet.repository';
import { TagRepository } from './repositories/tag.repository';
import { ContactAdjustmentsService } from './services/contact-adjustments.service';
import { ContactMembershipsService } from './services/contact-memberships.service';
import { ContactPrintAppointmentsService } from './services/contact-print-appointments.service';
import { ContactTagsService } from './services/contact-tags.service';
import { ContactTimelineService } from './services/contact-timeline.service';
import { ContactWalletService } from './services/contact-wallet.service';
import { ContactsService } from './services/contacts.service';

@Module({
  imports: [
    AuditModule,
    StorageModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => GiftCardsModule),
    forwardRef(() => MembershipsModule),
    forwardRef(() => PackagesModule),
  ],
  controllers: [
    ContactWorkspaceController,
    ContactsController,
    PlatformContactsController,
    ContactTagsController,
  ],
  providers: [
    ContactRepository,
    ContactWalletRepository,
    ContactAdjustmentRepository,
    TagRepository,
    ContactsService,
    ContactTagsService,
    ContactTimelineService,
    ContactWalletService,
    ContactAdjustmentsService,
    ContactMembershipsService,
    ContactPrintAppointmentsService,
  ],
  exports: [ContactRepository, TagRepository, ContactsService],
})
export class ContactsModule {}
