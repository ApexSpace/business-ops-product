import { Injectable } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import type { PayableHandler } from '../types/payable.types';

@Injectable()
export class PayableHandlerRegistry {
  private readonly handlers = new Map<PayableType, PayableHandler>();

  register(handler: PayableHandler): void {
    this.handlers.set(handler.payableType, handler);
  }

  get(payableType: PayableType): PayableHandler {
    const handler = this.handlers.get(payableType);
    if (!handler) {
      throw new Error(`No payable handler registered for ${payableType}`);
    }
    return handler;
  }
}
