import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessModule } from '../business/business.module';
import { BusinessMembershipController } from './controllers/business-membership.controller';
import { PlatformMembershipController } from './controllers/platform-membership.controller';
import { PlatformUsersController } from './controllers/platform-users.controller';
import { BusinessMembershipRepository } from './repositories/business-membership.repository';
import { PlatformMembershipAdminRepository } from './repositories/platform-membership-admin.repository';
import { MembershipService } from './services/membership.service';
import { PlatformUserService } from './services/platform-user.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [
    BusinessMembershipController,
    PlatformMembershipController,
    PlatformUsersController,
  ],
  providers: [
    BusinessMembershipRepository,
    PlatformMembershipAdminRepository,
    MembershipService,
    PlatformUserService,
  ],
  exports: [BusinessMembershipRepository, MembershipService],
})
export class MembershipModule {}
