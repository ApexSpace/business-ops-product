import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerTasksService } from './scheduler-tasks.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SchedulerTasksService],
})
export class AppSchedulerModule {}
