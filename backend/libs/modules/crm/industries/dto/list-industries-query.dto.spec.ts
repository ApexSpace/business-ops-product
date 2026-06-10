import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IndustryStatus } from '@prisma/client';
import { ListIndustriesQueryDto } from './list-industries-query.dto';

describe('ListIndustriesQueryDto', () => {
  it('accepts pagination with status and search filters', async () => {
    const dto = plainToInstance(ListIndustriesQueryDto, {
      page: '1',
      limit: '50',
      status: IndustryStatus.ACTIVE,
      search: 'retail',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toBe(IndustryStatus.ACTIVE);
    expect(dto.search).toBe('retail');
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListIndustriesQueryDto,
      {
        page: '1',
        limit: '20',
        status: IndustryStatus.ACTIVE,
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
