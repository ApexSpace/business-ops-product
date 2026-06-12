import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { FormSubmissionsService } from './form-submissions.service';

function buildService() {
  const formsRepository = {
    findById: jest.fn(),
  };
  const submissionsRepository = {
    findMany: jest.fn(),
    deleteById: jest.fn(),
  };
  const service = new FormSubmissionsService(
    formsRepository as never,
    submissionsRepository as never,
  );
  return { service, formsRepository, submissionsRepository };
}

describe('FormSubmissionsService', () => {
  it('lists submissions for a form', async () => {
    const { service, formsRepository, submissionsRepository } = buildService();
    formsRepository.findById.mockResolvedValue({ id: 'form-1' });
    submissionsRepository.findMany.mockResolvedValue({
      items: [
        {
          id: 'sub-1',
          formId: 'form-1',
          data: { email: 'a@b.com' },
          metadata: null,
          createdAt: new Date('2026-06-12T12:00:00.000Z'),
        },
      ],
      total: 1,
    });

    const result = await service.list('biz-1', 'form-1', { page: 1, limit: 25 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'sub-1',
      data: { email: 'a@b.com' },
    });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 25 });
  });

  it('throws FORM_NOT_FOUND when listing for a missing form', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(null);

    await expect(
      service.list('biz-1', 'missing', { page: 1, limit: 25 }),
    ).rejects.toMatchObject({
      code: ErrorCode.FORM_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('deletes a submission', async () => {
    const { service, formsRepository, submissionsRepository } = buildService();
    formsRepository.findById.mockResolvedValue({ id: 'form-1' });
    submissionsRepository.deleteById.mockResolvedValue(true);

    await expect(
      service.remove('biz-1', 'form-1', 'sub-1'),
    ).resolves.toBeUndefined();
  });

  it('throws FORM_SUBMISSION_NOT_FOUND when delete misses', async () => {
    const { service, formsRepository, submissionsRepository } = buildService();
    formsRepository.findById.mockResolvedValue({ id: 'form-1' });
    submissionsRepository.deleteById.mockResolvedValue(false);

    await expect(
      service.remove('biz-1', 'form-1', 'missing'),
    ).rejects.toMatchObject({
      code: ErrorCode.FORM_SUBMISSION_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });
});
