import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { NotesController } from './controllers/notes.controller';
import { NoteRepository } from './repositories/note.repository';
import { NotesService } from './services/notes.service';

@Module({
  imports: [AuditModule, ContactsModule, LeadsModule],
  controllers: [NotesController],
  providers: [NoteRepository, NotesService],
  exports: [NoteRepository, NotesService],
})
export class NotesModule {}
