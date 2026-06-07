import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { InvoicesModule } from '@app/modules/finance/invoices/invoices.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentsOverviewService } from './services/payments-overview.service';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [AuditModule, BusinessModule, InvoicesModule, IntegrationsModule, EmailModule],
  controllers: [PaymentsController],
  providers: [PaymentRepository, PaymentsService, PaymentsOverviewService],
  exports: [PaymentRepository, PaymentsService, PaymentsOverviewService],
})
export class PaymentsModule {}
