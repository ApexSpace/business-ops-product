import {
  sanitizeFormSubmissionData,
  validateFormSubmission,
} from './form-submission-validation.util';

describe('form-submission-validation.util', () => {
  const fields = [
    {
      id: 'f1',
      type: 'text',
      label: 'Name',
      name: 'name',
      validation: { required: true, minLength: 2 },
    },
    {
      id: 'f2',
      type: 'email',
      label: 'Email',
      name: 'email',
      validation: { required: true },
    },
    {
      id: 'f3',
      type: 'select',
      label: 'Plan',
      name: 'plan',
      options: [
        { id: 'o1', label: 'Basic', value: 'basic' },
        { id: 'o2', label: 'Pro', value: 'pro' },
      ],
    },
  ];

  it('returns errors for missing required fields', () => {
    const errors = validateFormSubmission(fields, { name: 'A' });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'email' }),
      ]),
    );
  });

  it('sanitizes valid submission data', () => {
    const sanitized = sanitizeFormSubmissionData(fields, {
      name: ' Ada ',
      email: 'ada@example.com',
      plan: 'pro',
      extra: 'ignored',
    });

    expect(sanitized).toEqual({
      name: ' Ada ',
      email: 'ada@example.com',
      plan: 'pro',
    });
  });

  it('validates nested column fields', () => {
    const nested = [
      {
        id: 'c1',
        type: 'columns',
        label: 'Columns',
        name: 'columns',
        columns: [
          [
            {
              id: 'f4',
              type: 'phone',
              label: 'Phone',
              name: 'phone',
              validation: { required: true },
            },
          ],
        ],
      },
    ];

    expect(validateFormSubmission(nested, {})).toEqual([
      expect.objectContaining({ field: 'phone' }),
    ]);
  });
});
