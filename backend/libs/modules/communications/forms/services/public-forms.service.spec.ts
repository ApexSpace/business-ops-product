import { FormStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PublicFormsService } from './public-forms.service';

function buildForm(overrides: Record<string, unknown> = {}) {
  return {
    id: 'form-1',
    businessId: 'biz-1',
    name: 'Lead form',
    slug: 'lead-form',
    publicKey: 'pk_public',
    status: FormStatus.PUBLISHED,
    definition: {
      fields: [{ id: 'f1', type: 'text', label: 'Name', name: 'name' }],
      settings: { title: 'Lead form', submitButtonLabel: 'Submit' },
    },
    metadata: null,
    publishedAt: new Date(),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('PublicFormsService', () => {
  function buildService() {
    const formsRepository = {
      findByPublicKey: jest.fn(),
    };
    const submissionsRepository = {
      create: jest.fn(),
    };
    const service = new PublicFormsService(
      formsRepository as never,
      submissionsRepository as never,
    );
    return { service, formsRepository, submissionsRepository };
  }

  it('returns public config for a published form', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findByPublicKey.mockResolvedValue(buildForm());

    const result = await service.getConfig('pk_public');

    expect(result.publicKey).toBe('pk_public');
    expect(result.name).toBe('Lead form');
    expect(result.definition.fields).toHaveLength(1);
  });

  it('rejects draft forms', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findByPublicKey.mockResolvedValue(
      buildForm({ status: FormStatus.DRAFT }),
    );

    await expect(service.getConfig('pk_public')).rejects.toMatchObject({
      code: ErrorCode.FORM_NOT_FOUND,
    });
  });

  it('rejects unknown public keys', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findByPublicKey.mockResolvedValue(null);

    await expect(service.getConfig('missing')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('records a valid submission for a published form', async () => {
    const { service, formsRepository, submissionsRepository } = buildService();
    formsRepository.findByPublicKey.mockResolvedValue(buildForm());
    submissionsRepository.create.mockResolvedValue({
      id: 'submission-1',
      businessId: 'biz-1',
      formId: 'form-1',
      publicKey: 'pk_public',
      data: { name: 'Ada' },
      metadata: null,
      createdAt: new Date(),
    });

    const result = await service.submit('pk_public', {
      data: { name: 'Ada' },
    });

    expect(submissionsRepository.create).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'submission-1',
      success: true,
      redirectUrl: null,
    });
  });

  it('rejects invalid submissions', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findByPublicKey.mockResolvedValue(
      buildForm({
        definition: {
          fields: [
            {
              id: 'f1',
              type: 'email',
              label: 'Email',
              name: 'email',
              validation: { required: true },
            },
          ],
          settings: { title: 'Lead form', submitButtonLabel: 'Submit' },
        },
      }),
    );

    await expect(
      service.submit('pk_public', { data: { email: 'not-an-email' } }),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });
});
