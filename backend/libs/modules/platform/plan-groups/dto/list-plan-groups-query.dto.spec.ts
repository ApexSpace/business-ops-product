import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PlanGroupStatus } from '@prisma/client';
import { ListPlanGroupsQueryDto } from './list-plan-groups-query.dto';

describe('ListPlanGroupsQueryDto', () => {
  it('accepts pagination with status and search filters', async () => {
    const dto = plainToInstance(ListPlanGroupsQueryDto, {
      page: '1',
      limit: '50',
      status: PlanGroupStatus.PUBLISHED,
      search: 'pro',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toBe(PlanGroupStatus.PUBLISHED);
    expect(dto.search).toBe('pro');
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListPlanGroupsQueryDto,
      {
        page: '1',
        limit: '50',
        status: PlanGroupStatus.PUBLISHED,
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
