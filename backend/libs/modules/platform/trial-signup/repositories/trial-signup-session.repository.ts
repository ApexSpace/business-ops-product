import { Injectable } from '@nestjs/common';
import { Prisma, TrialSignupSession } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { TRIAL_SESSION_TTL_MS } from '../constants/trial-signup.constants';

@Injectable()
export class TrialSignupSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(payload: Prisma.InputJsonValue = {}): Promise<TrialSignupSession> {
    return this.prisma.trialSignupSession.create({
      data: {
        payload,
        expiresAt: new Date(Date.now() + TRIAL_SESSION_TTL_MS),
      },
    });
  }

  findActiveById(id: string): Promise<TrialSignupSession | null> {
    return this.prisma.trialSignupSession.findFirst({
      where: {
        id,
        expiresAt: { gt: new Date() },
      },
    });
  }

  updatePayload(
    id: string,
    payload: Prisma.InputJsonValue,
    extras?: { phoneVerifiedAt?: Date | null },
  ): Promise<TrialSignupSession> {
    return this.prisma.trialSignupSession.update({
      where: { id },
      data: {
        payload,
        phoneVerifiedAt: extras?.phoneVerifiedAt,
        expiresAt: new Date(Date.now() + TRIAL_SESSION_TTL_MS),
      },
    });
  }

  deleteById(id: string): Promise<TrialSignupSession> {
    return this.prisma.trialSignupSession.delete({ where: { id } });
  }

  deleteExpired(): Promise<number> {
    return this.prisma.trialSignupSession
      .deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      .then((result) => result.count);
  }
}
