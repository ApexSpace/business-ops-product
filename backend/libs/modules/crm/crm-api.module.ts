import { Module } from '@nestjs/common';
import { CrmModule } from './crm.module';

@Module({
  imports: [CrmModule],
})
export class CrmApiModule {}
