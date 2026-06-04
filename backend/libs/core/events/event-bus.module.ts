import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventPublisherService } from './event-publisher.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [EventPublisherService],
  exports: [EventEmitterModule, EventPublisherService],
})
export class EventBusModule {}
