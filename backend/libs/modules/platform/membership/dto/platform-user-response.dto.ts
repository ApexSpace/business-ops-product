import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformMemberRole, UserStatus } from '@prisma/client';

export class PlatformUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: PlatformMemberRole })
  role!: PlatformMemberRole;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  createdAt!: Date;
}
