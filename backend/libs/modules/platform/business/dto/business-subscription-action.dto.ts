import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BusinessSubscriptionBillingCycle,
  SubscriptionPaymentMethod,
} from '@prisma/client';
import { BusinessAccessDto } from './business-access.dto';
import { RecordPaymentDto } from './business-subscription-payment.dto';
import type {
  CapabilityDiff,
  SubscriptionActionDefinition,
  SubscriptionActionKey,
} from '../types/subscription-action.types';
import type { SubscriptionStateSnapshot } from '../types/subscription-state-snapshot.types';

export class PreviewActionDto {
  @ApiProperty()
  @IsString()
  actionKey!: SubscriptionActionKey;

  @ApiPropertyOptional({ description: 'Action-specific input payload' })
  @IsOptional()
  input?: Record<string, unknown>;
}

export class PreviewActionResultDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  allowed!: boolean;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  beforeState!: SubscriptionStateSnapshot;

  @ApiProperty()
  afterState!: SubscriptionStateSnapshot;

  @ApiProperty()
  accessImpact!: {
    beforeCanAccess: boolean;
    afterCanAccess: boolean;
    beforeReason: string;
    afterReason: string;
  };

  @ApiPropertyOptional()
  paymentImpact?: {
    createsPaymentRecord: boolean;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    paymentType?: string;
  };

  @ApiPropertyOptional()
  capabilityDiff?: CapabilityDiff;

  @ApiPropertyOptional()
  snapshotImpact?: {
    oldSnapshotId?: string | null;
    newSnapshotId?: string | null;
    applySnapshot: boolean;
    mayOverwriteConfiguration: boolean;
  };

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty()
  requiresConfirmation!: boolean;
}

export class MarkPaidDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: SubscriptionPaymentMethod })
  @IsOptional()
  @IsEnum(SubscriptionPaymentMethod)
  paymentMethod?: SubscriptionPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;

  @ApiPropertyOptional({
    description: 'Skip ledger record when no payment details; requires reason and notes.',
  })
  @IsOptional()
  @IsBoolean()
  skipPaymentRecord?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ChangePackagePaymentOption {
  static readonly NO_PAYMENT = 'no_payment';
  static readonly RECORD_PAYMENT = 'record_payment';
  static readonly MOVE_PENDING = 'move_pending';
  static readonly KEEP_STATUS = 'keep_status';
}

export class ChangePackageActionDto {
  @ApiProperty()
  @IsUUID()
  planTierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planGroupId?: string;

  @ApiPropertyOptional({ enum: BusinessSubscriptionBillingCycle })
  @IsOptional()
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle?: BusinessSubscriptionBillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'When true, keeps the current subscription amount.',
  })
  @IsOptional()
  @IsBoolean()
  keepCurrentPrice?: boolean;

  @ApiPropertyOptional({
    description: 'When true, uses amount as an admin override.',
  })
  @IsOptional()
  @IsBoolean()
  customPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncCapabilities?: boolean;

  @ApiPropertyOptional({
    enum: [
      'no_payment',
      'record_payment',
      'move_pending',
      'keep_status',
    ],
  })
  @IsOptional()
  @IsString()
  paymentOption?: string;

  @ApiPropertyOptional({ type: RecordPaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecordPaymentDto)
  payment?: RecordPaymentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ChangeSnapshotActionDto {
  @ApiProperty()
  @IsUUID()
  snapshotId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  applySnapshot?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ReactivateBusinessDto {
  @ApiPropertyOptional({
    enum: ['business_only', 'restore_paid', 'restore_trial', 'restore_internal'],
  })
  @IsOptional()
  @IsString()
  mode?: 'business_only' | 'restore_paid' | 'restore_trial' | 'restore_internal';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @ApiPropertyOptional({ type: RecordPaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecordPaymentDto)
  payment?: RecordPaymentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ManualAccessUpdateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  notes!: string;

  @ApiPropertyOptional({ description: 'Partial access fields to update' })
  @IsOptional()
  fields?: Record<string, unknown>;
}

export class SubscriptionActionResultDto extends BusinessAccessDto {
  @ApiPropertyOptional()
  correlationId?: string;
}

export class BusinessAccessWithActionsDto extends BusinessAccessDto {
  @ApiProperty({ type: [Object] })
  availableActions!: SubscriptionActionDefinition[];

  @ApiPropertyOptional({ type: Object })
  recommendedAction?: SubscriptionActionDefinition | null;
}

export class ActionReasonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'When true and billing source is Stripe, cancels immediately in Stripe.',
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}
