import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { PlatformAuditController } from './controllers/platform-audit.controller';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditService } from './services/audit.service';

@Module({
  controllers: [AuditController, PlatformAuditController],
  providers: [AuditLogRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
