import { Injectable } from '@nestjs/common';
import { IntegrationResourceSyncHandler } from './resource-sync.types';
import { FacebookResourceSyncHandler } from './facebook-resource-sync.handler';
import { GoogleCalendarResourceSyncHandler } from './google-calendar-resource-sync.handler';
import { GoogleBusinessProfileResourceSyncHandler } from './google-business-profile-resource-sync.handler';
import { InstagramResourceSyncHandler } from './instagram-resource-sync.handler';
import { WhatsAppResourceSyncHandler } from './whatsapp-resource-sync.handler';

@Injectable()
export class IntegrationResourceSyncRegistry {
  private readonly handlers: Map<string, IntegrationResourceSyncHandler>;

  constructor(
    googleCalendarHandler: GoogleCalendarResourceSyncHandler,
    googleBusinessProfileHandler: GoogleBusinessProfileResourceSyncHandler,
    facebookHandler: FacebookResourceSyncHandler,
    instagramHandler: InstagramResourceSyncHandler,
    whatsappHandler: WhatsAppResourceSyncHandler,
  ) {
    this.handlers = new Map(
      [
        googleCalendarHandler,
        googleBusinessProfileHandler,
        facebookHandler,
        instagramHandler,
        whatsappHandler,
      ].map((handler) => [handler.providerKey, handler]),
    );
  }

  getHandler(providerKey: string): IntegrationResourceSyncHandler | null {
    return this.handlers.get(providerKey) ?? null;
  }

  hasHandler(providerKey: string): boolean {
    return this.handlers.has(providerKey);
  }
}
