import { ApiProperty } from '@nestjs/swagger';

export class ContactMembershipsResponseDto {
  @ApiProperty()
  available!: boolean;

  @ApiProperty({ type: [Object] })
  memberships!: unknown[];

  @ApiProperty({ type: [Object] })
  packages!: unknown[];

  @ApiProperty({ nullable: true })
  message!: string | null;
}
