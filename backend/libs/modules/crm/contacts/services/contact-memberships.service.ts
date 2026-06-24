import { Injectable } from '@nestjs/common';
import { ContactMembershipsResponseDto } from '../dto/contact-memberships-response.dto';

@Injectable()
export class ContactMembershipsService {
  getMemberships(): ContactMembershipsResponseDto {
    return {
      available: false,
      memberships: [],
      packages: [],
      message: 'Memberships and packages coming soon',
    };
  }
}
