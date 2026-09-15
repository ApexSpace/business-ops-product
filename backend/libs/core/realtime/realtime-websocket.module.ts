import { DynamicModule, Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RootConfig } from '@app/core/config/configuration';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { AuthModule } from '@app/modules/platform/auth/auth.module';
import { ConversationRealtimeGateway } from './conversation-realtime.gateway';
import { RealtimeBridgeService } from './realtime-bridge.service';
import { isRealtimeWebSocketEnabled } from './realtime.config';
import { RealtimeSocketAuthService } from './realtime-socket-auth.service';
/**
 * Socket.io gateway + Redis bridge. Imported by the API app only (not worker).
 */
@Module({})
export class RealtimeWebSocketModule {
  static register(): DynamicModule {
    if (!isRealtimeWebSocketEnabled()) {
      return {
        module: RealtimeWebSocketModule,
      };
    }

    return {
      module: RealtimeWebSocketModule,
      imports: [
        ConfigModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService<RootConfig, true>) => ({
            secret: configService.get('jwt.accessSecret', { infer: true }),
          }),
        }),
        forwardRef(() => AuthModule),
        forwardRef(() => BusinessModule),
        forwardRef(() => MembershipModule),
      ],
      providers: [
        RealtimeSocketAuthService,
        RealtimeBridgeService,
        ConversationRealtimeGateway,
      ],
    };
  }
}
