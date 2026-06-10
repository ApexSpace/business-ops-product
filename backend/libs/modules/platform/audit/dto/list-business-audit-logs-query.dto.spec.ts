import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListBusinessAuditLogsQueryDto } from './list-business-audit-logs-query.dto';

describe('ListBusinessAuditLogsQueryDto', () => {
  it('accepts pagination with action filter', async () => {
    const dto = plainToInstance(ListBusinessAuditLogsQueryDto, {
      page: '1',
      limit: '50',
      action: 'contact.created',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.action).toBe('contact.created');
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListBusinessAuditLogsQueryDto,
      {
        page: '1',
        limit: '20',
        action: 'contact.created',
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
