import { HttpStatus, Injectable } from '@nestjs/common';
import { PipelineStageType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  validateSync,
} from 'class-validator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { isBusinessConfigurableEmailType } from '@app/modules/communications/email/email-type.registry';
import { isAllowedBusinessIcon } from '../registries/business-icon.registry';
import { isAllowedBusinessRoute } from '../registries/business-route.registry';
import { isAllowedDashboardWidget } from '../registries/dashboard-widget.registry';
import {
  parseSnapshotAssets,
  sanitizeSnapshotAssets,
} from '../mappers/snapshot-assets.parser';
import { SnapshotAssets } from '../types/snapshot-assets.types';

class SnapshotNavItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  route!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  labelKey!: string;

  @IsNumber()
  order!: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

class SnapshotDashboardWidgetDto {
  @IsString()
  key!: string;

  @IsNumber()
  order!: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

class SnapshotQuickLinkDto {
  @IsString()
  href!: string;

  @IsOptional()
  @IsString()
  labelKey?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsNumber()
  order!: number;
}

class SnapshotDashboardDto {
  @IsArray()
  widgets!: SnapshotDashboardWidgetDto[];

  @IsArray()
  quickLinks!: SnapshotQuickLinkDto[];
}

class SnapshotPipelineStageDto {
  @IsString()
  name!: string;

  @IsEnum(PipelineStageType)
  type!: PipelineStageType;
}

class SnapshotPipelineDto {
  @IsString()
  sourceKey!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  stages!: SnapshotPipelineStageDto[];
}

class SnapshotAssetsDto {
  @IsObject()
  terminology!: Record<string, string>;

  @IsArray()
  navigation!: SnapshotNavItemDto[];

  @IsObject()
  dashboard!: SnapshotDashboardDto;

  @IsOptional()
  @IsObject()
  crm?: {
    pipelines?: SnapshotPipelineDto[];
    services?: Array<{ sourceKey: string; name: string }>;
    tags?: Array<{ sourceKey: string; name: string }>;
  };

  @IsOptional()
  @IsArray()
  calendars?: Array<{ sourceKey: string; name: string }>;

  @IsOptional()
  @IsArray()
  chatbots?: Array<{ sourceKey: string; name: string }>;

  @IsOptional()
  @IsObject()
  emails?: {
    preferences?: Array<{ emailType: string; enabled: boolean }>;
    templates?: Array<{ emailType: string; subject: string; htmlBody: string }>;
  };

  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  integrations?: Record<string, unknown>;
}

@Injectable()
export class SnapshotValidationService {
  validateAndSanitize(raw: unknown): SnapshotAssets {
    const parsed = parseSnapshotAssets(raw);
    const sanitized = sanitizeSnapshotAssets(parsed);
    const dto = plainToInstance(SnapshotAssetsDto, sanitized);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    const messages: string[] = errors.flatMap((e) =>
      Object.values(e.constraints ?? {}),
    );

    for (const item of sanitized.navigation ?? []) {
      if (!isAllowedBusinessRoute(item.route)) {
        messages.push(`Invalid navigation route: ${item.route}`);
      }
      if (!isAllowedBusinessIcon(item.icon)) {
        messages.push(`Invalid navigation icon: ${item.icon}`);
      }
    }

    for (const link of sanitized.dashboard?.quickLinks ?? []) {
      if (!isAllowedBusinessRoute(link.href)) {
        messages.push(`Invalid quick link route: ${link.href}`);
      }
    }

    for (const widget of sanitized.dashboard?.widgets ?? []) {
      if (!isAllowedDashboardWidget(widget.key)) {
        messages.push(`Invalid dashboard widget: ${widget.key}`);
      }
    }

    for (const pref of sanitized.emails?.preferences ?? []) {
      if (!isBusinessConfigurableEmailType(pref.emailType)) {
        messages.push(`Invalid email preference type: ${pref.emailType}`);
      }
    }

    for (const tmpl of sanitized.emails?.templates ?? []) {
      if (!isBusinessConfigurableEmailType(tmpl.emailType)) {
        messages.push(`Invalid email template type: ${tmpl.emailType}`);
      }
    }

    for (const pipeline of sanitized.crm?.pipelines ?? []) {
      for (const stage of pipeline.stages ?? []) {
        if (
          stage.type !== PipelineStageType.OPEN &&
          stage.type !== PipelineStageType.WON &&
          stage.type !== PipelineStageType.LOST
        ) {
          messages.push(`Invalid pipeline stage type: ${stage.type}`);
        }
      }
    }

    if (messages.length > 0) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        messages.join('; '),
        HttpStatus.BAD_REQUEST,
      );
    }

    return sanitized;
  }
}
