import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class WaitingRoomSettingsResponseDto {
  @ApiProperty()
  waitingStatusEnabled!: boolean;
}

export class UpdateWaitingRoomSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waitingStatusEnabled?: boolean;
}
