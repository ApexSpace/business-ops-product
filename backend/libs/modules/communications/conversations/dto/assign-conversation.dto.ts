import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignConversationDto {
  @ApiPropertyOptional({ nullable: true, description: 'Null to unassign' })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;
}
