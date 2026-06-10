import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListPlatformUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PlatformMemberRole })
  @IsOptional()
  @IsEnum(PlatformMemberRole)
  role?: PlatformMemberRole;
}
