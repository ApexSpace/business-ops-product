import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicPricingDto } from '@app/modules/platform/plan-groups/dto';

export class BusinessPlanTierOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sortOrder!: number;
}

export class BusinessPlanOptionsDto {
  @ApiProperty({ type: PublicPricingDto })
  pricing!: PublicPricingDto;

  @ApiProperty({ type: [BusinessPlanTierOptionDto] })
  tiers!: BusinessPlanTierOptionDto[];

  @ApiPropertyOptional({ nullable: true })
  currentPlanTierId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentPlanTierSlug?: string | null;

  @ApiProperty()
  currentPlanTierIndex!: number;
}
