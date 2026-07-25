import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { INTERNAL_OPS_BUSINESS_ID } from '../utils/tenant-business-scope.util';

/**
 * Resolves the single platform INTERNAL ops business id.
 * Prefer the seeded stable id; fall back to type lookup.
 */
@Injectable()
export class InternalBusinessService {
  private cachedId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getId(): Promise<string> {
    if (this.cachedId) {
      return this.cachedId;
    }

    const byId = await this.prisma.business.findFirst({
      where: { id: INTERNAL_OPS_BUSINESS_ID, type: BusinessType.INTERNAL },
      select: { id: true },
    });
    if (byId) {
      this.cachedId = byId.id;
      return byId.id;
    }

    const byType = await this.prisma.business.findFirst({
      where: { type: BusinessType.INTERNAL },
      select: { id: true },
    });
    if (!byType) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Platform INTERNAL ops business is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.cachedId = byType.id;
    return byType.id;
  }
}
