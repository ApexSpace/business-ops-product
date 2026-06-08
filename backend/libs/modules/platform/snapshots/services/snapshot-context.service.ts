import { Injectable } from '@nestjs/common';
import { SnapshotStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  DEFAULT_SNAPSHOT_CONTEXT,
  SnapshotContextResponse,
} from '../constants/default-snapshot-context';
import { SnapshotContextDto } from '../dto/snapshot.dto';
import { parseSnapshotAssets } from '../mappers/snapshot-assets.parser';

@Injectable()
export class SnapshotContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getForBusiness(businessId: string): Promise<SnapshotContextDto> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: {
        snapshot: true,
      },
    });

    if (
      !business?.snapshot ||
      business.snapshot.deletedAt ||
      business.snapshot.status !== SnapshotStatus.PUBLISHED
    ) {
      return {
        ...DEFAULT_SNAPSHOT_CONTEXT,
        dashboard: {
          widgets: [],
          quickLinks: DEFAULT_SNAPSHOT_CONTEXT.dashboard.quickLinks,
        },
      };
    }

    const assets = parseSnapshotAssets(business.snapshot.assets);

    const context: SnapshotContextResponse = {
      snapshotId: business.snapshot.id,
      snapshotName: business.snapshot.name,
      contextVersion: business.snapshot.updatedAt.toISOString(),
      terminology: assets.terminology,
      navigation: assets.navigation,
      dashboard: assets.dashboard,
      branding: assets.branding ?? {},
    };

    return context;
  }
}
