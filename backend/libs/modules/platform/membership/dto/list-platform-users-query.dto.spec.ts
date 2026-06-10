import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PlatformMemberRole } from '@prisma/client';
import { ListPlatformUsersQueryDto } from './list-platform-users-query.dto';

describe('ListPlatformUsersQueryDto', () => {
  it('accepts pagination with role filter', async () => {
    const dto = plainToInstance(ListPlatformUsersQueryDto, {
      page: '1',
      limit: '50',
      role: PlatformMemberRole.PLATFORM_ADMIN,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.role).toBe(PlatformMemberRole.PLATFORM_ADMIN);
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListPlatformUsersQueryDto,
      {
        page: '1',
        limit: '20',
        role: PlatformMemberRole.SUPPORT,
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
