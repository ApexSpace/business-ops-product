import { Injectable } from '@nestjs/common';
import { ClientMembershipsService } from '@app/modules/finance/memberships/services/client-memberships.service';
import { ClientPackagesService } from '@app/modules/finance/packages/services/client-packages.service';
import { ContactMembershipsResponseDto } from '../dto/contact-memberships-response.dto';

@Injectable()
export class ContactMembershipsService {
  constructor(
    private readonly clientPackagesService: ClientPackagesService,
    private readonly clientMembershipsService: ClientMembershipsService,
  ) {}

  async getMemberships(
    businessId: string,
    contactId: string,
  ): Promise<ContactMembershipsResponseDto> {
    const [packages, membershipsResult] = await Promise.all([
      this.clientPackagesService.findForContact(businessId, contactId),
      this.clientMembershipsService.listClientMemberships(businessId, {
        contactId,
        page: 1,
        limit: 100,
      }),
    ]);

    return {
      available: true,
      memberships: membershipsResult.items,
      packages,
      message: null,
    };
  }
}
