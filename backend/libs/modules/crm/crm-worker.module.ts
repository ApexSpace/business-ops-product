import { Module } from '@nestjs/common';
import { DataIoModule } from '@app/modules/platform/data-io/data-io.module';

/** CRM async workers — data import/export processors live in DataIoModule */
@Module({
  imports: [DataIoModule],
  exports: [DataIoModule],
})
export class CrmWorkerModule {}
