import {
  parseFormDefinition,
  sanitizeFormFields,
  sanitizeFormDefinition,
} from './form-definition.util';

describe('form-definition.util', () => {
  it('sanitizes corrupt top-level field arrays', () => {
    expect(sanitizeFormFields([[], [], { id: 'f1', type: 'email', label: 'E', name: 'e' }])).toEqual([
      { id: 'f1', type: 'email', label: 'E', name: 'e' },
    ]);
  });

  it('sanitizes nested column fields', () => {
    const fields = sanitizeFormFields([
      {
        id: 'c1',
        type: 'columns',
        label: 'Columns',
        name: 'columns',
        columns: [
          [{ id: 'f1', type: 'text', label: 'A', name: 'a' }],
          [],
        ],
      },
    ]);

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      type: 'columns',
      columns: [
        [{ id: 'f1', type: 'text', label: 'A', name: 'a' }],
        [],
      ],
    });
  });

  it('parseFormDefinition sanitizes stored corrupt definitions', () => {
    const parsed = parseFormDefinition({
      definition: {
        fields: [[], [], [], []],
        settings: { title: 'Broken form', submitButtonLabel: 'Submit' },
      },
    });

    expect(parsed.fields).toEqual([]);
    expect(parsed.settings.title).toBe('Broken form');
  });

  it('keeps valid field rows with id, type, and label', () => {
    const fields = sanitizeFormFields([
      { id: 'f1', type: 'heading', label: 'Welcome', name: 'welcome', content: 'Hi' },
      { id: 'f2', type: 'email', label: 'Email', name: 'email' },
      { id: 'f3', type: 'select', label: 'Pick', name: 'pick', options: [] },
    ]);

    expect(fields).toHaveLength(3);
    expect(fields[0]).toMatchObject({ type: 'heading', content: 'Hi' });
    expect(fields[1]).toMatchObject({ type: 'email' });
    expect(fields[2]).toMatchObject({ type: 'select' });
  });

  it('sanitizeFormDefinition merges default settings', () => {
    const sanitized = sanitizeFormDefinition({
      fields: [{ id: 'f1', type: 'text', label: 'Name', name: 'name' }],
      settings: { title: 'My form', accentColor: '#123456' },
    });

    expect(sanitized.settings).toMatchObject({
      title: 'My form',
      accentColor: '#123456',
      submitButtonLabel: 'Submit',
      showRequiredIndicator: true,
    });
  });
});
