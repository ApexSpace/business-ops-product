import {
  Controller,
  Param,
  ParseUUIDPipe,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { RedisPubSubService } from './redis-pub-sub.service';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('realtime')
@UseGuards(BusinessRolesGuard)
export class SseController {
  constructor(private readonly pubSub: RedisPubSubService) {}

  @Sse('business/:businessId/events')
  events(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: Request & { user?: { businessId?: string } },
  ): Observable<MessageEvent> {
    if (!this.pubSub.isAvailable()) {
      return new Observable((subscriber) => {
        subscriber.next({
          data: JSON.stringify({
            event: 'realtime.disabled',
            data: { reason: 'redis_unavailable' },
            at: new Date().toISOString(),
          }),
        } as MessageEvent);
        subscriber.complete();
      });
    }

    const userBusinessId = req.user?.businessId;
    if (userBusinessId && userBusinessId !== businessId) {
      return new Observable((subscriber) => {
        subscriber.error(new Error('Forbidden'));
      });
    }

    return new Observable((subscriber) => {
      let unsubscribe: (() => void) | undefined;
      void this.pubSub
        .subscribe(businessId, (message) => {
          subscriber.next({ data: message } as MessageEvent);
        })
        .then((fn) => {
          unsubscribe = fn;
        });

      return () => {
        unsubscribe?.();
      };
    });
  }
}
