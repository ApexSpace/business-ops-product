import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { InvoicesModule } from '@app/modules/finance/invoices/invoices.module';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentsOverviewService } from './services/payments-overview.service';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [AuditModule, InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentRepository, PaymentsService, PaymentsOverviewService],
  exports: [PaymentRepository, PaymentsService, PaymentsOverviewService],
})
export class PaymentsModule {}
