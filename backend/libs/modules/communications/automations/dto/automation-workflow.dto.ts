import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AutomationWorkflowRunStatus,
  AutomationWorkflowStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
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
  @IsOptional()
  @Allow()
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
  @IsObject()
  config!: Record<string, unknown>;
}

export class WorkflowTimeWindowDto {
  @ApiProperty()
  @IsString()
  @MaxLength(8)
  start!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(8)
  end!: string;
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

  @ApiPropertyOptional({ enum: ['every_time', 'once_per_context', 'once_per_subject', 'once_per_period'] })
  @IsOptional()
  @IsIn(['every_time', 'once_per_context', 'once_per_subject', 'once_per_period'])
  runPolicy?: 'every_time' | 'once_per_context' | 'once_per_subject' | 'once_per_period';

  @ApiPropertyOptional({ description: 'Lookback days when runPolicy is once_per_period' })
  @IsOptional()
  @Type(() => Number)
  runPolicyPeriodDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  timeWindowEnabled?: boolean;

  @ApiPropertyOptional({ type: WorkflowTimeWindowDto, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @ValidateNested()
  @Type(() => WorkflowTimeWindowDto)
  timeWindow?: WorkflowTimeWindowDto | null;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  senderFromNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  markConversationsRead?: boolean;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  triggerKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedBefore?: string;
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
