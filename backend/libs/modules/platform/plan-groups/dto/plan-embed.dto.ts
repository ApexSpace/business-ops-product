import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanEmbedLayout, PlanEmbedTheme } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePlanEmbedSettingsDto {
  @ApiPropertyOptional({ enum: PlanEmbedTheme })
  @IsOptional()
  @IsEnum(PlanEmbedTheme)
  theme?: PlanEmbedTheme;

  @ApiPropertyOptional({ enum: PlanEmbedLayout })
  @IsOptional()
  @IsEnum(PlanEmbedLayout)
  layout?: PlanEmbedLayout;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showMonthlyYearlyToggle?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showFeatureComparison?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSetupFee?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTrialDays?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCapabilities?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTierFeatures?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string;
}

export class PlanEmbedSettingsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  planGroupId!: string;

  @ApiProperty({ enum: PlanEmbedTheme })
  theme!: PlanEmbedTheme;

  @ApiProperty({ enum: PlanEmbedLayout })
  layout!: PlanEmbedLayout;

  @ApiProperty()
  showMonthlyYearlyToggle!: boolean;

  @ApiProperty()
  showFeatureComparison!: boolean;

  @ApiProperty()
  showSetupFee!: boolean;

  @ApiProperty()
  showTrialDays!: boolean;

  @ApiProperty()
  showCapabilities!: boolean;

  @ApiProperty()
  showTierFeatures!: boolean;

  @ApiPropertyOptional()
  customCss?: string | null;

  @ApiProperty()
  updatedAt!: string;
}
