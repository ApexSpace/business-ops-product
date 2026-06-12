import { FormStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { FormsService } from './forms.service';

function buildForm(overrides: Record<string, unknown> = {}) {
  return {
    id: 'form-1',
    businessId: 'biz-1',
    name: 'Lead form',
    slug: 'lead-form',
    publicKey: 'pk_original',
    status: FormStatus.DRAFT,
    definition: {
      fields: [{ id: 'f1', type: 'text', label: 'Name', name: 'name' }],
      settings: { title: 'Lead form', submitButtonLabel: 'Submit' },
    },
    metadata: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('FormsService', () => {
  const businessId = 'biz-1';
  const otherBusinessId = 'biz-2';
  const actor = { userId: 'user-1', businessId, context: 'business' as const };

  function buildService() {
    const formsRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    const embedService = {
      buildEmbed: jest.fn().mockReturnValue({
        publicKey: 'pk_original',
        slug: 'lead-form',
        scriptUrl: 'https://api.example.com/widgets/form.js',
        iframeUrl: 'https://api.example.com/widgets/form/pk_original',
        hostedPageUrl: 'https://app.example.com/widget/form/pk_original',
        embedCode: '<script></script>',
        iframeEmbed: '<iframe></iframe>',
        isPublished: false,
      }),
    };
    const service = new FormsService(
      formsRepository as never,
      embedService as never,
    );
    return { service, formsRepository, embedService };
  }

  it('creates a form with generated slug, publicKey, and default definition', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.create.mockImplementation(async (data) => ({
      ...buildForm(),
      name: data.name,
      slug: 'lead-capture',
      publicKey: data.publicKey,
      definition: data.definition,
    }));

    const result = await service.create(
      businessId,
      { name: 'Lead Capture' },
      actor as never,
    );

    expect(formsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Lead Capture',
        status: FormStatus.DRAFT,
        business: { connect: { id: businessId } },
      }),
    );
    expect(result.name).toBe('Lead Capture');
    expect(result.status).toBe('draft');
    expect(result.publicKey).toBeTruthy();
    expect(result.definition.fields).toHaveLength(1);
  });

  it('lists forms with pagination meta', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findMany.mockResolvedValue({
      items: [buildForm()],
      total: 1,
    });

    const result = await service.list(businessId, { page: 1, limit: 20 });

    expect(formsRepository.findMany).toHaveBeenCalledWith(
      businessId,
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.items[0].fieldCount).toBe(1);
  });

  it('lists fieldCount as top-level builder field count including layout blocks', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findMany.mockResolvedValue({
      items: [
        buildForm({
          definition: {
            fields: [
              { id: 'f1', type: 'heading', label: 'Title' },
              { id: 'f2', type: 'paragraph', label: 'Intro' },
              { id: 'f3', type: 'divider', label: 'Divider' },
            ],
            settings: { title: 'Lead form', submitButtonLabel: 'Submit' },
          },
        }),
      ],
      total: 1,
    });

    const result = await service.list(businessId, { page: 1, limit: 20 });

    expect(result.items[0].fieldCount).toBe(3);
  });

  it('gets a form by id for the current business', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());

    const result = await service.get(businessId, 'form-1');

    expect(formsRepository.findById).toHaveBeenCalledWith(businessId, 'form-1');
    expect(result.id).toBe('form-1');
    expect(result.definition.settings.title).toBe('Lead form');
    expect(result.definition.fields).toHaveLength(1);
    expect(result.definition.fields[0]).toMatchObject({
      id: 'f1',
      type: 'text',
      label: 'Name',
      name: 'name',
    });
  });

  it('throws FORM_NOT_FOUND when form is missing or belongs to another tenant', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(null);

    await expect(service.get(otherBusinessId, 'form-1')).rejects.toMatchObject({
      code: ErrorCode.FORM_NOT_FOUND,
    });
  });

  it('updates form name and definition', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.update.mockResolvedValue(
      buildForm({
        name: 'Updated',
        definition: {
          fields: [],
          settings: { title: 'Updated', submitButtonLabel: 'Go' },
        },
      }),
    );

    const result = await service.update(businessId, 'form-1', {
      name: 'Updated',
      definition: {
        fields: [],
        settings: { title: 'Updated', submitButtonLabel: 'Go' },
      },
    });

    expect(formsRepository.update).toHaveBeenCalled();
    expect(result.name).toBe('Updated');
  });

  it('persists mixed field types, options, and form settings on update', async () => {
    const { service, formsRepository } = buildService();
    const savedDefinition = {
      fields: [
        {
          id: 'f1',
          type: 'heading',
          label: 'Welcome',
          name: 'welcome',
          content: 'Hello',
          level: 2,
        },
        {
          id: 'f2',
          type: 'email',
          label: 'Email',
          name: 'email',
          validation: { required: true },
          style: { labelColor: '#111111', width: 50 },
        },
        {
          id: 'f3',
          type: 'select',
          label: 'Department',
          name: 'department',
          options: [
            { id: 'o1', label: 'Sales', value: 'sales' },
            { id: 'o2', label: 'Support', value: 'support' },
          ],
        },
      ],
      settings: {
        title: 'Contact us',
        accentColor: '#6366f1',
        backgroundColor: '#ffffff',
        submitButtonLabel: 'Send',
        successMessage: 'Thanks',
        showRequiredIndicator: true,
      },
    };

    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.update.mockImplementation(async (_id, data) =>
      buildForm({
        definition: data.definition,
      }),
    );

    const result = await service.update(businessId, 'form-1', {
      definition: savedDefinition,
    });

    expect(formsRepository.update).toHaveBeenCalledWith(
      'form-1',
      expect.objectContaining({
        definition: expect.objectContaining({
          fields: savedDefinition.fields,
          settings: expect.objectContaining(savedDefinition.settings),
        }),
      }),
    );
    expect(result.definition.fields).toHaveLength(3);
    expect(result.definition.fields[0]).toMatchObject({
      type: 'heading',
      content: 'Hello',
      level: 2,
    });
    expect(result.definition.fields[1]).toMatchObject({
      type: 'email',
      validation: { required: true },
      style: { labelColor: '#111111', width: 50 },
    });
    expect(result.definition.fields[2]).toMatchObject({
      type: 'select',
      options: [
        { id: 'o1', label: 'Sales', value: 'sales' },
        { id: 'o2', label: 'Support', value: 'support' },
      ],
    });
    expect(result.definition.settings).toMatchObject({
      title: 'Contact us',
      accentColor: '#6366f1',
      backgroundColor: '#ffffff',
    });
  });

  it('drops invalid top-level field arrays before persisting definition', async () => {
    const { service, formsRepository } = buildService();
    const validField = {
      id: 'f1',
      type: 'text',
      label: 'Name',
      name: 'name',
    };

    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.update.mockImplementation(async (_id, data) =>
      buildForm({
        definition: data.definition,
      }),
    );

    const result = await service.update(businessId, 'form-1', {
      definition: {
        fields: [[], [], validField],
        settings: { title: 'Form', submitButtonLabel: 'Submit' },
      },
    });

    expect(formsRepository.update).toHaveBeenCalledWith(
      'form-1',
      expect.objectContaining({
        definition: {
          fields: [validField],
          settings: expect.objectContaining({ title: 'Form' }),
        },
      }),
    );
    expect(result.definition.fields).toHaveLength(1);
    expect(result.definition.fields[0]).toMatchObject({ type: 'text', name: 'name' });
  });

  it('duplicates a form as draft with a new publicKey and (Copy) name', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.create.mockImplementation(async (data) => ({
      ...buildForm(),
      id: 'form-2',
      name: data.name,
      slug: data.slug,
      publicKey: data.publicKey,
      status: data.status,
    }));

    const result = await service.duplicate(businessId, 'form-1');

    expect(formsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Lead form (Copy)',
        status: FormStatus.DRAFT,
      }),
    );
    expect(result.id).toBe('form-2');
    expect(result.status).toBe('draft');
  });

  it('publishes, moves to draft, and archives with status timestamps', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.update.mockImplementation(async (_id, data) =>
      buildForm({
        status: data.status,
        publishedAt: data.publishedAt ?? null,
        archivedAt: data.archivedAt ?? null,
      }),
    );

    const published = await service.publish(businessId, 'form-1');
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeTruthy();

    const draft = await service.moveToDraft(businessId, 'form-1');
    expect(draft.status).toBe('draft');
    expect(draft.publishedAt).toBeNull();

    const archived = await service.archive(businessId, 'form-1');
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).toBeTruthy();
  });

  it('soft deletes a form', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.softDelete.mockResolvedValue(true);

    await service.remove(businessId, 'form-1');

    expect(formsRepository.softDelete).toHaveBeenCalledWith(
      businessId,
      'form-1',
    );
  });

  it('throws when soft delete affects zero rows', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());
    formsRepository.softDelete.mockResolvedValue(false);

    await expect(service.remove(businessId, 'form-1')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('returns embed config for an existing form', async () => {
    const { service, formsRepository, embedService } = buildService();
    formsRepository.findById.mockResolvedValue(buildForm());

    const result = await service.getEmbedForForm(businessId, 'form-1');

    expect(embedService.buildEmbed).toHaveBeenCalledWith({
      publicKey: 'pk_original',
      slug: 'lead-form',
      status: FormStatus.DRAFT,
    });
    expect(result.publicKey).toBe('pk_original');
  });

  it('throws when embed is requested for a missing form', async () => {
    const { service, formsRepository } = buildService();
    formsRepository.findById.mockResolvedValue(null);

    await expect(
      service.getEmbedForForm(businessId, 'missing'),
    ).rejects.toMatchObject({ code: ErrorCode.FORM_NOT_FOUND });
  });
});
