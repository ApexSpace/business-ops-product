import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventPublisherService {
  constructor(private readonly emitter: EventEmitter2) {}

  publish<T>(eventName: string, payload: T): void {
    this.emitter.emit(eventName, payload);
  }
}
