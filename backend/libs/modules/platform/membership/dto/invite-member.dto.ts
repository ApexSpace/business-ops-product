import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: BusinessMemberRole })
  @IsEnum(BusinessMemberRole)
  role!: BusinessMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}
