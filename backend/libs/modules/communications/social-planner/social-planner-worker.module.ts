import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { FacebookPublishAdapter } from './adapters/facebook.adapter';
import { GoogleBusinessProfilePublishAdapter } from './adapters/gbp.adapter';
import { InstagramPublishAdapter } from './adapters/instagram.adapter';
import { LinkedInPublishAdapter } from './adapters/linkedin.adapter';
import { MockSocialPublishAdapter } from './adapters/mock.adapter';
import { PinterestPublishAdapter } from './adapters/pinterest.adapter';
import { SocialPublishAdapterRegistry } from './adapters/social-publish.registry';
import { TikTokPublishAdapter } from './adapters/tiktok.adapter';
import { XPublishAdapter } from './adapters/x.adapter';
import { YouTubePublishAdapter } from './adapters/youtube.adapter';
import { FacebookEngagementAdapter } from './engagement/facebook-engagement.adapter';
import { InstagramEngagementAdapter } from './engagement/instagram-engagement.adapter';
import { SocialEngagementAdapterRegistry } from './engagement/social-engagement.registry';
import { YouTubeEngagementAdapter } from './engagement/youtube-engagement.adapter';
import { SocialCommentRepository } from './repositories/social-comment.repository';
import { SocialPostRepository } from './repositories/social-post.repository';
import { SocialCommentIngestionService } from './services/social-comment-ingestion.service';
import { SocialCommentsService } from './services/social-comments.service';
import { SocialEngagementReconcileService } from './services/social-engagement-reconcile.service';
import { SocialMetricsSyncService } from './services/social-metrics-sync.service';
import { SocialPublishService } from './services/social-publish.service';
import { SocialSafetyNetService } from './services/social-safety-net.service';
import { SocialTokenResolverService } from './services/social-token-resolver.service';
import { SocialPublishProcessor } from './workers/processors/social-publish.processor';

const publishProviders = [
  SocialPostRepository,
  SocialPublishService,
  SocialTokenResolverService,
  SocialSafetyNetService,
  SocialPublishProcessor,
  FacebookPublishAdapter,
  InstagramPublishAdapter,
  GoogleBusinessProfilePublishAdapter,
  LinkedInPublishAdapter,
  YouTubePublishAdapter,
  XPublishAdapter,
  PinterestPublishAdapter,
  TikTokPublishAdapter,
  MockSocialPublishAdapter,
  SocialPublishAdapterRegistry,
] as const;

const engagementProviders = [
  SocialCommentRepository,
  FacebookEngagementAdapter,
  InstagramEngagementAdapter,
  YouTubeEngagementAdapter,
  SocialEngagementAdapterRegistry,
  SocialCommentsService,
  SocialCommentIngestionService,
  SocialEngagementReconcileService,
  SocialMetricsSyncService,
] as const;

/**
 * Worker / scheduler subset — no HTTP controllers (avoids BusinessCapabilityGuard DI).
 * Kept in a separate file from SocialPlannerModule so MetaWebhookProcessorModule can
 * import engagement ingestion without circularly loading the API module (which would
 * leave BusinessModule undefined in SocialPlannerModule.imports).
 */
@Module({
  imports: [
    AuditModule,
    StorageModule,
    forwardRef(() => IntegrationsModule),
  ],
  providers: [...publishProviders, ...engagementProviders],
  exports: [
    SocialPostRepository,
    SocialPublishService,
    SocialSafetyNetService,
    SocialPublishProcessor,
    SocialPublishAdapterRegistry,
    SocialCommentRepository,
    SocialCommentsService,
    SocialCommentIngestionService,
    SocialEngagementReconcileService,
    SocialMetricsSyncService,
    SocialEngagementAdapterRegistry,
  ],
})
export class SocialPlannerWorkerModule {}
