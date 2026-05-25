import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContactTagsController } from './controllers/contact-tags.controller';
import { ContactsController } from './controllers/contacts.controller';
import { ContactRepository } from './repositories/contact.repository';
import { TagRepository } from './repositories/tag.repository';
import { ContactTagsService } from './services/contact-tags.service';
import { ContactsService } from './services/contacts.service';

@Module({
  imports: [AuditModule],
  controllers: [ContactsController, ContactTagsController],
  providers: [
    ContactRepository,
    TagRepository,
    ContactsService,
    ContactTagsService,
  ],
  exports: [ContactRepository, TagRepository, ContactsService],
})
export class ContactsModule {}
