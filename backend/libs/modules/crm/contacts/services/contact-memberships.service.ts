import { Injectable } from '@nestjs/common';
import { ClientPackagesService } from '@app/modules/finance/packages/services/client-packages.service';
import { ContactMembershipsResponseDto } from '../dto/contact-memberships-response.dto';

@Injectable()
export class ContactMembershipsService {
  constructor(private readonly clientPackagesService: ClientPackagesService) {}

  async getMemberships(
    businessId: string,
    contactId: string,
  ): Promise<ContactMembershipsResponseDto> {
    const packages = await this.clientPackagesService.findForContact(
      businessId,
      contactId,
    );
    return {
      available: true,
      memberships: [],
      packages,
      message: null,
    };
  }
}
