import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListPlatformAuditLogsQueryDto } from './list-platform-audit-logs-query.dto';

describe('ListPlatformAuditLogsQueryDto', () => {
  it('accepts pagination with audit log filters', async () => {
    const dto = plainToInstance(ListPlatformAuditLogsQueryDto, {
      page: '1',
      limit: '50',
      businessId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      action: 'platform.business.created',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.action).toBe('platform.business.created');
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListPlatformAuditLogsQueryDto,
      {
        page: '1',
        limit: '20',
        action: 'platform.business.created',
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
