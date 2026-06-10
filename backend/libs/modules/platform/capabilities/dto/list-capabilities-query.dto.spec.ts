import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CapabilityStatus } from '@prisma/client';
import { ListCapabilitiesQueryDto } from './list-capabilities-query.dto';

describe('ListCapabilitiesQueryDto', () => {
  it('accepts pagination with status and search filters', async () => {
    const dto = plainToInstance(ListCapabilitiesQueryDto, {
      page: '1',
      limit: '100',
      status: CapabilityStatus.ACTIVE,
      search: 'crm',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toBe(CapabilityStatus.ACTIVE);
    expect(dto.search).toBe('crm');
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListCapabilitiesQueryDto,
      {
        page: '1',
        limit: '20',
        status: CapabilityStatus.ACTIVE,
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
