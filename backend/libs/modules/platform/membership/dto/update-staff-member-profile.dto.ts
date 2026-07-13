import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStaffMemberProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineBookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isServiceProvider?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canManageWaitlist?: boolean;
}
