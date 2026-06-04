import { Module } from '@nestjs/common';
import { ContactsModule } from './contacts/contacts.module';
import { IndustriesModule } from './industries/industries.module';
import { LeadsModule } from './leads/leads.module';
import { NotesModule } from './notes/notes.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    ContactsModule,
    LeadsModule,
    PipelinesModule,
    NotesModule,
    ServicesModule,
    IndustriesModule,
  ],
  exports: [ContactsModule, LeadsModule, PipelinesModule],
})
export class CrmModule {}
