import { IntersectionType } from '@nestjs/swagger';
import { CreateBusinessDto as CreateBusinessProfileDto } from './business-profile.dto';
import { BusinessAccessCreateFieldsDto } from './business-access.dto';

export class CreateBusinessDto extends IntersectionType(
  CreateBusinessProfileDto,
  BusinessAccessCreateFieldsDto,
) {}
