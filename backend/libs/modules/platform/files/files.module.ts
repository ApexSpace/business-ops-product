import { Module } from '@nestjs/common';
import { FilesController } from './presentation/controllers/files.controller';
import { FilesService } from './application/files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
