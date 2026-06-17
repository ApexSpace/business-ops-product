import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AutomationWorkflowRunStatus,
  AutomationWorkflowStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class WorkflowTriggerFilterDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  fieldKey!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  operator!: string;

  @ApiPropertyOptional()
  value?: unknown;
}

export class WorkflowStepDto {
  @ApiProperty()
  @IsUUID('4')
  id!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  actionKey!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  config!: Record<string, unknown>;
}

export class WorkflowSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowReentry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowMultipleContexts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stopOnResponse?: boolean;

  @ApiPropertyOptional({ enum: ['every_time', 'once_per_context', 'once_per_subject'] })
  @IsOptional()
  @IsIn(['every_time', 'once_per_context', 'once_per_subject'])
  runPolicy?: 'every_time' | 'once_per_context' | 'once_per_subject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderFromName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  senderFromEmail?: string | null;
}

export class CreateAutomationWorkflowDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  triggerKey!: string;

  @ApiPropertyOptional({ type: [WorkflowTriggerFilterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerFilterDto)
  triggerFilters?: WorkflowTriggerFilterDto[];

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];

  @ApiPropertyOptional({ type: WorkflowSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowSettingsDto)
  settings?: WorkflowSettingsDto;
}

export class UpdateAutomationWorkflowDto extends CreateAutomationWorkflowDto {}

export class UpdateAutomationWorkflowStatusDto {
  @ApiProperty({ enum: AutomationWorkflowStatus })
  @IsEnum(AutomationWorkflowStatus)
  status!: AutomationWorkflowStatus;
}

export class ListAutomationWorkflowsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: AutomationWorkflowStatus })
  @IsOptional()
  @IsEnum(AutomationWorkflowStatus)
  status?: AutomationWorkflowStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  triggerKey?: string;
}

export class ListAutomationWorkflowRunsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  workflowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional({ enum: AutomationWorkflowRunStatus })
  @IsOptional()
  @IsEnum(AutomationWorkflowRunStatus)
  status?: AutomationWorkflowRunStatus;
}

export class PublishAutomationWorkflowDto {
  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];

  @ApiPropertyOptional({ type: [WorkflowTriggerFilterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerFilterDto)
  triggerFilters?: WorkflowTriggerFilterDto[];
}
