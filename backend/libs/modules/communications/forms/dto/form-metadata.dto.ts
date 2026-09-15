import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type {
  FormFieldImplementationStatus,
  FormFieldRole,
} from '../types/form-registry.types';

export class FormFieldCategoryResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  icon?: string;
}

export class FormFieldTypeResponseDto {
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

  @ApiProperty({ enum: ['input', 'layout', 'choice', 'composite'] })
  role!: FormFieldRole;

  @ApiProperty({ enum: ['implemented', 'planned', 'stub'] })
  implementationStatus!: FormFieldImplementationStatus;

  @ApiProperty()
  countsAsInput!: boolean;

  @ApiProperty()
  supportsOptions!: boolean;

  @ApiProperty()
  supportsValidation!: boolean;

  @ApiProperty()
  supportsPlaceholder!: boolean;

  @ApiProperty()
  supportsLabel!: boolean;

  @ApiProperty()
  supportsInputStyle!: boolean;

  @ApiProperty()
  supportsLabelStyle!: boolean;

  @ApiProperty()
  supportsLayout!: boolean;
}

export class FormPaletteCategoryResponseDto extends FormFieldCategoryResponseDto {
  @ApiProperty({ type: FormFieldTypeResponseDto, isArray: true })
  fields!: FormFieldTypeResponseDto[];
}

export class FormMetadataQueryDto {
  @ApiPropertyOptional({ description: 'Comma-separated category keys' })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({ enum: ['implemented', 'planned', 'stub'] })
  @IsOptional()
  @IsIn(['implemented', 'planned', 'stub'])
  status?: FormFieldImplementationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
