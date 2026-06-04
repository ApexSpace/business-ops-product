import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IndustryOptionDto } from '../dto/industry.dto';
import { IndustriesService } from '@app/modules/crm/industries/services/industries.service';

/** Active industries for business profile forms (any authenticated user). */
@ApiTags('industries')
@ApiBearerAuth()
@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get('active')
  listActive(): Promise<IndustryOptionDto[]> {
    return this.industriesService.listActiveOptions();
  }
}
