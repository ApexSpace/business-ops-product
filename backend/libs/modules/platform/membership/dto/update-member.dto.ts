import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessMemberRole, MembershipStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: BusinessMemberRole })
  @IsOptional()
  @IsEnum(BusinessMemberRole)
  role?: BusinessMemberRole;

  @ApiPropertyOptional({ enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
