import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessMemberRole,
  MembershipStatus,
  UserStatus,
} from '@prisma/client';

export class MemberUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;
}

export class MemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty({ enum: BusinessMemberRole })
  role!: BusinessMemberRole;

  @ApiProperty({ enum: MembershipStatus })
  status!: MembershipStatus;

  @ApiProperty()
  user!: MemberUserDto;

  @ApiPropertyOptional()
  joinedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class InviteMemberResponseDto extends MemberResponseDto {
  @ApiProperty()
  inviteLink!: string;
}
