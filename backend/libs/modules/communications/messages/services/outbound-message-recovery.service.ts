import { Injectable, OnModuleInit } from '@nestjs/common';
import { OutboundMessageDispatchService } from './outbound-message-dispatch.service';

@Injectable()
export class OutboundMessageRecoveryService implements OnModuleInit {
  constructor(
    private readonly outboundMessageDispatch: OutboundMessageDispatchService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.outboundMessageDispatch.recoverPendingOnStartup();
  }
}
