import { Injectable } from '@nestjs/common';
import { MetaResourceSyncService } from '../../meta/services/meta-resource-sync.service';
import {
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

@Injectable()
export class InstagramResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'instagram';

  constructor(
    private readonly metaResourceSyncService: MetaResourceSyncService,
  ) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const items = await this.metaResourceSyncService.fetchResources(
      context.businessId,
      context.providerKey,
    );
    await this.metaResourceSyncService.ensureMessagingWebhookSubscriptions(
      context.businessId,
      'instagram',
      items,
    );
    return { items, synced: true };
  }
}
