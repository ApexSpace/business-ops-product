import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContactsModule } from '../contacts/contacts.module';
import { MembershipModule } from '../membership/membership.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { ServicesModule } from '../services/services.module';
import { LeadsController } from './controllers/leads.controller';
import { LeadRepository } from './repositories/lead.repository';
import { LeadsService } from './services/leads.service';

@Module({
  imports: [
    AuditModule,
    PipelinesModule,
    ContactsModule,
    ServicesModule,
    MembershipModule,
  ],
  controllers: [LeadsController],
  providers: [LeadRepository, LeadsService],
  exports: [LeadRepository, LeadsService],
})
export class LeadsModule {}
