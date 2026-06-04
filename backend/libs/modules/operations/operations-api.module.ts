import { Module } from '@nestjs/common';
import { OperationsModule } from './operations.module';

@Module({
  imports: [OperationsModule],
})
export class OperationsApiModule {}
