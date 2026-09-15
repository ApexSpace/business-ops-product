import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvitePreviewResponseDto {
  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  inviterName?: string | null;

  @ApiProperty({
    description:
      'When true, the invitee must set a password. When false, they may activate with an existing account.',
  })
  requiresPassword!: boolean;
}
