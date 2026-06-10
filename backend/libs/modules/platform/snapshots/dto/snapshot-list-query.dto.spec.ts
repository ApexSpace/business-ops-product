import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SnapshotStatus } from '@prisma/client';
import { SnapshotListQueryDto } from './snapshot.dto';

describe('SnapshotListQueryDto', () => {
  it('accepts pagination with status filter', async () => {
    const dto = plainToInstance(SnapshotListQueryDto, {
      page: '1',
      limit: '50',
      status: SnapshotStatus.PUBLISHED,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toBe(SnapshotStatus.PUBLISHED);
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      SnapshotListQueryDto,
      {
        page: '1',
        limit: '50',
        status: SnapshotStatus.PUBLISHED,
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
