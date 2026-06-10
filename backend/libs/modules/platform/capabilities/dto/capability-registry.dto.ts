import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import type {
  CapabilityRegistryDiffEntry,
  CapabilityRegistrySyncReport,
} from '../types/capability-registry.types';

export class CapabilityRegistrySyncDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class CapabilityRegistryDiffDto implements CapabilityRegistrySyncReport {
  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty({ type: [Object] })
  availableInCode!: CapabilityRegistryDiffEntry[];

  @ApiProperty({ type: [Object] })
  synced!: CapabilityRegistryDiffEntry[];

  @ApiProperty({ type: [Object] })
  missingInDb!: CapabilityRegistryDiffEntry[];

  @ApiProperty({ type: [Object] })
  missingInCode!: CapabilityRegistryDiffEntry[];

  @ApiProperty({ type: [Object] })
  drifted!: CapabilityRegistryDiffEntry[];

  @ApiProperty({ type: [String] })
  warnings!: string[];
}
