import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { IndustriesController } from './controllers/industries.controller';
import { PlatformIndustriesController } from './controllers/platform-industries.controller';
import { IndustryRepository } from './repositories/industry.repository';
import { IndustriesService } from './services/industries.service';

@Module({
  imports: [AuditModule],
  controllers: [PlatformIndustriesController, IndustriesController],
  providers: [IndustriesService, IndustryRepository],
  exports: [IndustriesService, IndustryRepository],
})
export class IndustriesModule {}
