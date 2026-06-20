import type {
  FormFieldDefinition,
  FormFieldImplementationStatus,
  FormFieldRole,
} from '../types/form-registry.types';

type FieldOverrides = Partial<
  Omit<FormFieldDefinition, 'key' | 'category' | 'label'>
>;

function defaultsForRole(
  role: FormFieldRole,
): Omit<
  FormFieldDefinition,
  'key' | 'category' | 'label' | 'description' | 'icon'
> {
  const isLayout = role === 'layout';
  const isChoice = role === 'choice';
  const isComposite = role === 'composite';

  return {
    role,
    implementationStatus: 'implemented',
    countsAsInput: !isLayout,
    supportsOptions: isChoice,
    supportsValidation: !isLayout,
    supportsPlaceholder: !isLayout && !isComposite,
    supportsLabel: !isLayout || role === 'layout',
    supportsInputStyle: !isLayout,
    supportsLabelStyle: !isLayout,
    supportsLayout: true,
  };
}

function field(
  key: string,
  category: string,
  label: string,
  role: FormFieldRole,
  overrides: FieldOverrides = {},
): FormFieldDefinition {
  const base = defaultsForRole(role);
  return {
    key,
    category,
    label,
    description: overrides.description ?? '',
    ...base,
    ...overrides,
    role: overrides.role ?? role,
  };
}

function layoutField(
  key: string,
  label: string,
  overrides: FieldOverrides = {},
): FormFieldDefinition {
  return field(key, 'layout', label, 'layout', {
    countsAsInput: false,
    supportsValidation: false,
    supportsPlaceholder: false,
    supportsInputStyle: false,
    supportsLabelStyle: false,
    ...overrides,
  });
}

export const FORM_FIELD_REGISTRY: FormFieldDefinition[] = [
  // Basic
  field('text', 'basic', 'Text', 'input', { icon: 'type' }),
  field('email', 'basic', 'Email', 'input', { icon: 'mail' }),
  field('phone', 'basic', 'Phone', 'input', { icon: 'phone' }),
  field('number', 'basic', 'Number', 'input', { icon: 'hash' }),
  field('password', 'basic', 'Password', 'input', { icon: 'key-round' }),
  field('textarea', 'basic', 'Long text', 'input', { icon: 'align-left' }),
  field('website', 'basic', 'Website', 'input', { icon: 'globe' }),

  // Choice
  field('select', 'choice', 'Dropdown', 'choice', { icon: 'list' }),
  field('multiselect', 'choice', 'Multi-select', 'choice', { icon: 'list' }),
  field('radio', 'choice', 'Radio group', 'choice', { icon: 'circle-dot' }),
  field('checkbox', 'choice', 'Checkbox', 'choice', { icon: 'check-square' }),
  field('toggle', 'choice', 'Toggle', 'choice', {
    icon: 'toggle-left',
    supportsOptions: false,
  }),

  // Date & time
  field('date', 'datetime', 'Date', 'input', { icon: 'calendar' }),
  field('time', 'datetime', 'Time', 'input', { icon: 'calendar' }),
  field('datetime', 'datetime', 'Date & time', 'input', {
    icon: 'calendar-clock',
  }),

  // Advanced
  field('file', 'advanced', 'File upload', 'input', { icon: 'file-up' }),
  field('signature', 'advanced', 'Signature', 'input', {
    icon: 'pen-line',
    supportsInputStyle: false,
  }),
  field('rating', 'advanced', 'Rating', 'input', {
    icon: 'star',
    supportsInputStyle: false,
    supportsPlaceholder: false,
  }),
  field('range', 'advanced', 'Range slider', 'input', {
    icon: 'sliders-horizontal',
    supportsInputStyle: false,
  }),
  field('hidden', 'advanced', 'Hidden field', 'input', {
    icon: 'eye-off',
    supportsLabel: false,
    supportsInputStyle: false,
    supportsLabelStyle: false,
    supportsValidation: false,
  }),
  field('captcha', 'advanced', 'Captcha', 'input', {
    icon: 'shield',
    supportsInputStyle: false,
    supportsPlaceholder: false,
  }),

  // Personal
  field('name', 'personal', 'Full name', 'composite', {
    icon: 'user',
    supportsPlaceholder: true,
  }),
  field('address', 'personal', 'Address', 'composite', {
    icon: 'align-left',
    supportsPlaceholder: true,
  }),

  // Layout
  layoutField('heading', 'Heading', {
    icon: 'heading',
    supportsLabel: false,
    supportsLayout: true,
  }),
  layoutField('paragraph', 'Paragraph', {
    icon: 'text-cursor-input',
    supportsLabel: false,
  }),
  layoutField('divider', 'Divider', {
    icon: 'minus',
    supportsLabel: false,
    supportsLayout: false,
  }),
  layoutField('spacer', 'Spacer', {
    icon: 'space',
    supportsLabel: false,
    supportsLayout: false,
  }),
  layoutField('image', 'Image', {
    icon: 'image',
    supportsLabel: false,
  }),
  layoutField('columns', 'Columns', {
    icon: 'columns-2',
    countsAsInput: false,
    supportsLabel: true,
    supportsLabelStyle: true,
  }),
];

export const FORM_FIELD_BY_KEY = Object.fromEntries(
  FORM_FIELD_REGISTRY.map((definition) => [definition.key, definition]),
) as Record<string, FormFieldDefinition>;

export function isKnownFormFieldType(type: string): boolean {
  return type in FORM_FIELD_BY_KEY;
}

export function getFormFieldDefinition(
  type: string,
): FormFieldDefinition | undefined {
  return FORM_FIELD_BY_KEY[type];
}

export function listFormFields(filter?: {
  categoryKeys?: string[];
  status?: FormFieldImplementationStatus;
  search?: string;
}): FormFieldDefinition[] {
  return FORM_FIELD_REGISTRY.filter((definition) => {
    if (
      filter?.categoryKeys?.length &&
      !filter.categoryKeys.includes(definition.category)
    ) {
      return false;
    }
    if (filter?.status && definition.implementationStatus !== filter.status) {
      return false;
    }
    if (filter?.search?.trim()) {
      const needle = filter.search.trim().toLowerCase();
      const haystack =
        `${definition.label} ${definition.description}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
