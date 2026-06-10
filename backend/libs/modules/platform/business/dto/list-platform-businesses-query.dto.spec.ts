import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  BusinessStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { ListPlatformBusinessesQueryDto } from './list-platform-businesses-query.dto';

describe('ListPlatformBusinessesQueryDto', () => {
  it('accepts pagination with business list filters', async () => {
    const dto = plainToInstance(
      ListPlatformBusinessesQueryDto,
      {
        page: '1',
        limit: '25',
        status: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        planGroupId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        planTierId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        canAccess: 'true',
        needsAttention: 'NO_PLAN_TIER',
        search: 'acme',
      },
      { enableImplicitConversion: true },
    );

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.canAccess).toBe(true);
    expect(dto.needsAttention).toBe('NO_PLAN_TIER');
    expect(dto.search).toBe('acme');
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListPlatformBusinessesQueryDto,
      {
        page: '1',
        limit: '20',
        unexpected: 'value',
      },
      { enableImplicitConversion: true },
    );

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'unexpected')).toBe(true);
  });
});
