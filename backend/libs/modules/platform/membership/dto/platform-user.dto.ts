import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePlatformUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: PlatformMemberRole })
  @IsEnum(PlatformMemberRole)
  role!: PlatformMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class UpdatePlatformUserDto {
  @ApiPropertyOptional({ enum: PlatformMemberRole })
  @IsOptional()
  @IsEnum(PlatformMemberRole)
  role?: PlatformMemberRole;
}
