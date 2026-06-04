import { Module } from '@nestjs/common';
import { JobsController } from './presentation/controllers/jobs.controller';
import { JobsService } from './application/jobs.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
