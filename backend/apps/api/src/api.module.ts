import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { IdempotencyMiddleware } from '@app/common/middleware/idempotency.middleware';
import { CoreModule } from '@app/core/core.module';
import { RealtimeWebSocketModule } from '@app/core/realtime/realtime-websocket.module';
import { CommunicationsApiModule } from '@app/modules/communications/communications-api.module';
import { CrmApiModule } from '@app/modules/crm/crm-api.module';
import { FinanceApiModule } from '@app/modules/finance/finance-api.module';
import { IntegrationsApiModule } from '@app/modules/integrations/integrations-api.module';
import { OperationsApiModule } from '@app/modules/operations/operations-api.module';
import { PlatformApiModule } from '@app/modules/platform/platform-api.module';
import { QueueBoardModule } from './queue-board.module';

@Module({
  imports: [
    CoreModule,
    RealtimeWebSocketModule.register(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
      },
    ]),
    CrmApiModule,
    CommunicationsApiModule,
    IntegrationsApiModule,
    FinanceApiModule,
    OperationsApiModule,
    PlatformApiModule,
    QueueBoardModule,
  ],
  providers: [
    TransformInterceptor,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(IdempotencyMiddleware).forRoutes('*');
  }
}
