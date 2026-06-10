import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChatbotStatus } from '@prisma/client';
import { ListChatbotsQueryDto } from './chatbot.dto';

describe('ListChatbotsQueryDto', () => {
  it('accepts pagination with status filter', async () => {
    const dto = plainToInstance(ListChatbotsQueryDto, {
      page: '1',
      limit: '20',
      status: ChatbotStatus.ACTIVE,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toBe(ChatbotStatus.ACTIVE);
  });

  it('rejects unknown query properties when validated like the global pipe', async () => {
    const dto = plainToInstance(
      ListChatbotsQueryDto,
      {
        page: '1',
        limit: '20',
        status: ChatbotStatus.ACTIVE,
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
