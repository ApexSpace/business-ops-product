import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { IndustriesModule } from '@app/modules/crm/industries/industries.module';
import { PipelinesModule } from '@app/modules/crm/pipelines/pipelines.module';
import { AuthController } from './controllers/auth.controller';
import { PlatformMembershipRepository } from './repositories/platform-membership.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    forwardRef(() => BusinessModule),
    forwardRef(() => MembershipModule),
    PipelinesModule,
    IndustriesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    UserRepository,
    PlatformMembershipRepository,
    RefreshTokenRepository,
    JwtStrategy,
  ],
  exports: [AuthService, UserRepository, TokenService],
})
export class AuthModule {}
