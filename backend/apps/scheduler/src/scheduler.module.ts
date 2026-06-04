import { Module } from '@nestjs/common';
import { CoreModule } from '@app/core/core.module';
import { AppSchedulerModule } from '@app/core/scheduler/scheduler.module';

@Module({
  imports: [CoreModule, AppSchedulerModule],
})
export class SchedulerModule {}
