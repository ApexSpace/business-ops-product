import { Module } from '@nestjs/common';
import { CommunicationsModule } from './communications.module';

@Module({
  imports: [CommunicationsModule],
})
export class CommunicationsApiModule {}
