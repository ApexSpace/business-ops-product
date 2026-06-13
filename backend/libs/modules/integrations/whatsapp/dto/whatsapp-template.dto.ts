import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WhatsAppTemplateCategory,
  WhatsAppTemplateStatus,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

const LIST_SORT_FIELDS = ['name', 'updatedAt', 'createdAt', 'status'] as const;

export type WhatsAppTemplateListSortField =
  (typeof LIST_SORT_FIELDS)[number];

export class ListWhatsAppTemplatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: WhatsAppTemplateStatus })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const upper = value.toUpperCase();
    if (upper === 'ALL') return undefined;
    return upper;
  })
  @IsEnum(WhatsAppTemplateStatus)
  status?: WhatsAppTemplateStatus;

  @ApiPropertyOptional({ enum: WhatsAppTemplateCategory })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(WhatsAppTemplateCategory)
  category?: WhatsAppTemplateCategory;

  @ApiPropertyOptional({ enum: LIST_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(LIST_SORT_FIELDS)
  declare sortBy?: WhatsAppTemplateListSortField;
}

export class TemplateComponentDto {
  @ApiProperty()
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  example?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  buttons?: Record<string, unknown>[];
}

export class CreateWhatsAppTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(512)
  name!: string;

  @ApiProperty({ example: 'en_US' })
  @IsString()
  @MaxLength(20)
  language!: string;

  @ApiProperty({ enum: WhatsAppTemplateCategory })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(WhatsAppTemplateCategory)
  category!: WhatsAppTemplateCategory;

  @ApiProperty({ type: [TemplateComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components!: TemplateComponentDto[];

  @ApiPropertyOptional({ default: 'POSITIONAL' })
  @IsOptional()
  @IsString()
  parameterFormat?: string;
}

export class UpdateWhatsAppTemplateDto {
  @ApiPropertyOptional({ enum: WhatsAppTemplateCategory })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(WhatsAppTemplateCategory)
  category?: WhatsAppTemplateCategory;

  @ApiPropertyOptional({ type: [TemplateComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components?: TemplateComponentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parameterFormat?: string;
}

export class CreateWhatsAppTemplateWithHeaderDto extends CreateWhatsAppTemplateDto {
  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  headerFormat!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}
