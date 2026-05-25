import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ServicesController } from './controllers/services.controller';
import { ServiceRepository } from './repositories/service.repository';
import { ServicesService } from './services/services.service';

@Module({
  imports: [AuditModule],
  controllers: [ServicesController],
  providers: [ServiceRepository, ServicesService],
  exports: [ServiceRepository, ServicesService],
})
export class ServicesModule {}
