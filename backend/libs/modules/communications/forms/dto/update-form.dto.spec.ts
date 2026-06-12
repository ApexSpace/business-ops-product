import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateFormDto } from './update-form.dto';

const pipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

describe('UpdateFormDto', () => {
  it('preserves mixed field types and nested settings through validation', async () => {
    const payload = {
      name: 'Contact form',
      definition: {
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
            placeholder: 'you@example.com',
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
        },
      },
    };

    const dto = plainToInstance(UpdateFormDto, payload);
    const errors = await validate(dto, pipeOptions);

    expect(errors).toHaveLength(0);
    expect(dto.definition?.fields).toHaveLength(3);
    expect(dto.definition?.fields[0]).toMatchObject({
      id: 'f1',
      type: 'heading',
      content: 'Hello',
      level: 2,
    });
    expect(dto.definition?.fields[1]).toMatchObject({
      id: 'f2',
      type: 'email',
      validation: { required: true },
      style: { labelColor: '#111111', width: 50 },
    });
    expect(dto.definition?.fields[2]).toMatchObject({
      id: 'f3',
      type: 'select',
      options: [
        { id: 'o1', label: 'Sales', value: 'sales' },
        { id: 'o2', label: 'Support', value: 'support' },
      ],
    });
    expect(dto.definition?.settings).toMatchObject({
      title: 'Contact us',
      accentColor: '#6366f1',
      backgroundColor: '#ffffff',
    });
  });

  it('preserves field objects when implicit conversion is enabled (global ValidationPipe)', async () => {
    const payload = {
      definition: {
        fields: [
          {
            id: 'f1',
            type: 'text',
            label: 'Text',
            name: 'text_1',
            validation: {},
          },
          {
            id: 'f2',
            type: 'email',
            label: 'Email',
            name: 'email_2',
            validation: {},
          },
        ],
        settings: { title: 'Contact Us' },
      },
    };

    const dto = plainToInstance(UpdateFormDto, payload, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto, pipeOptions);

    expect(errors).toHaveLength(0);
    expect(dto.definition?.fields).toHaveLength(2);
    expect(dto.definition?.fields[0]).toMatchObject({
      id: 'f1',
      type: 'text',
      label: 'Text',
      name: 'text_1',
    });
    expect(dto.definition?.fields[1]).toMatchObject({
      id: 'f2',
      type: 'email',
    });
  });

  it('accepts definition payload at the DTO layer (service sanitizes invalid field rows)', async () => {
    const payload = {
      definition: {
        fields: [[], { id: 'f1', type: 'text', label: 'Name', name: 'name' }],
        settings: { title: 'Form', submitButtonLabel: 'Submit' },
      },
    };

    const dto = plainToInstance(UpdateFormDto, payload);
    const errors = await validate(dto, pipeOptions);

    expect(errors).toHaveLength(0);
    expect(dto.definition?.fields).toHaveLength(2);
  });
});
