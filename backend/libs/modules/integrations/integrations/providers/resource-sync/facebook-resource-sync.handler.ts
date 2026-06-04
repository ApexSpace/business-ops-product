import { Injectable } from '@nestjs/common';
import { MetaResourceSyncService } from '../../meta/services/meta-resource-sync.service';
import {
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

@Injectable()
export class FacebookResourceSyncHandler
  implements IntegrationResourceSyncHandler
{
  readonly providerKey = 'facebook';

  constructor(
    private readonly metaResourceSyncService: MetaResourceSyncService,
  ) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const items = await this.metaResourceSyncService.fetchResources(
      context.businessId,
      context.providerKey,
    );
    return { items, synced: true };
  }
}
