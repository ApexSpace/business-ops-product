import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { PipelinesModule } from '@app/modules/crm/pipelines/pipelines.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { LeadsController } from './controllers/leads.controller';
import { LeadRepository } from './repositories/lead.repository';
import { LeadsService } from './services/leads.service';

@Module({
  imports: [
    AuditModule,
    PipelinesModule,
    ContactsModule,
    ServicesModule,
    forwardRef(() => MembershipModule),
  ],
  controllers: [LeadsController],
  providers: [LeadRepository, LeadsService],
  exports: [LeadRepository, LeadsService],
})
export class LeadsModule {}
