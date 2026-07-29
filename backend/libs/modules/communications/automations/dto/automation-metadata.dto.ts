import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ImplementationStatus } from '../types/automation-registry.types';

const IMPLEMENTATION_STATUSES = ['implemented', 'planned', 'stub'] as const;

export class AutomationMetadataQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated category keys to filter results.',
    example: 'contact,appointment',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: IMPLEMENTATION_STATUSES,
    description: 'Filter by implementation status.',
  })
  @IsOptional()
  @IsIn(IMPLEMENTATION_STATUSES)
  status?: ImplementationStatus;

  @ApiPropertyOptional({
    description: 'Free-text search across label and description.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  get categoryKeys(): string[] | undefined {
    if (!this.category?.trim()) return undefined;
    return this.category
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

export class CustomValuesMetadataQueryDto extends AutomationMetadataQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated custom value category keys.',
    example: 'contact,business,appointment',
  })
  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.category)
  @IsString()
  categories?: string;

  get customValueCategoryKeys(): string[] | undefined {
    const raw = this.categories ?? this.category;
    if (!raw?.trim()) return undefined;
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

export class CategoryScopeQueryDto {
  @ApiPropertyOptional({
    enum: ['trigger', 'action', 'custom_value', 'condition'],
    description: 'Limit categories to a specific registry scope.',
  })
  @IsOptional()
  @IsIn(['trigger', 'action', 'custom_value', 'condition'])
  scope?: 'trigger' | 'action' | 'custom_value' | 'condition';
}

export class AutomationCategoryResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [String] })
  scopes!: string[];
}

export class TriggerFilterFieldResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional({ type: [String] })
  enumValues?: string[];
}

export class TriggerMetadataResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty({ enum: IMPLEMENTATION_STATUSES })
  implementationStatus!: ImplementationStatus;

  @ApiProperty()
  activatable!: boolean;

  @ApiPropertyOptional()
  auditAction?: string;

  @ApiProperty()
  subjectType!: string;

  @ApiPropertyOptional({ type: [String] })
  contextEntityTypes?: string[];

  @ApiPropertyOptional({ type: [TriggerFilterFieldResponseDto] })
  filterFields?: TriggerFilterFieldResponseDto[];

  @ApiPropertyOptional({ type: [String] })
  availableCustomValueCategories?: string[];
}

export class ActionMetadataResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty({ enum: IMPLEMENTATION_STATUSES })
  implementationStatus!: ImplementationStatus;

  @ApiProperty()
  activatable!: boolean;

  @ApiPropertyOptional({ type: [String] })
  requiredContext?: string[];

  @ApiPropertyOptional()
  isTerminal?: boolean;
}

export class CustomValueMetadataResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  example?: string;

  @ApiProperty()
  mergeTag!: string;

  @ApiProperty({ enum: IMPLEMENTATION_STATUSES })
  implementationStatus!: ImplementationStatus;
}

export class ConditionMetadataResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  valueType!: string;

  @ApiPropertyOptional({ type: [String] })
  enumValues?: string[];

  @ApiProperty({ enum: IMPLEMENTATION_STATUSES })
  implementationStatus!: ImplementationStatus;
}

export class FilterOperatorMetadataResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [String] })
  supportedValueTypes!: string[];
}

export class GroupedCustomValuesResponseDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: [CustomValueMetadataResponseDto] })
  items!: CustomValueMetadataResponseDto[];
}
