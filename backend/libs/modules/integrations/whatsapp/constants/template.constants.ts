import { WhatsAppTemplateCategory } from '@prisma/client';

export const WHATSAPP_TEMPLATE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,511}$/;

export const WHATSAPP_TEMPLATE_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'es_ES', label: 'Spanish (Spain)' },
  { code: 'es_MX', label: 'Spanish (Mexico)' },
  { code: 'fr_FR', label: 'French' },
  { code: 'de_DE', label: 'German' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'pt_PT', label: 'Portuguese (Portugal)' },
  { code: 'it_IT', label: 'Italian' },
  { code: 'nl_NL', label: 'Dutch' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ur', label: 'Urdu' },
  { code: 'zh_CN', label: 'Chinese (Simplified)' },
  { code: 'zh_TW', label: 'Chinese (Traditional)' },
] as const;

export const WHATSAPP_TEMPLATE_CATEGORIES: Array<{
  value: WhatsAppTemplateCategory;
  label: string;
  description: string;
}> = [
  {
    value: 'UTILITY',
    label: 'Utility',
    description: 'Account updates, order status, and service messages.',
  },
  {
    value: 'MARKETING',
    label: 'Marketing',
    description: 'Promotions, offers, and re-engagement messages.',
  },
  {
    value: 'AUTHENTICATION',
    label: 'Authentication',
    description: 'One-time passcodes and verification messages.',
  },
];

export const WHATSAPP_TEMPLATE_BUTTON_TYPES = [
  { value: 'QUICK_REPLY', label: 'Quick reply' },
  { value: 'URL', label: 'Visit website' },
  { value: 'PHONE_NUMBER', label: 'Call phone number' },
  { value: 'COPY_CODE', label: 'Copy offer code' },
] as const;

export const WHATSAPP_TEMPLATE_HEADER_FORMATS = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'DOCUMENT',
] as const;

export type WhatsAppTemplateHeaderFormat =
  (typeof WHATSAPP_TEMPLATE_HEADER_FORMATS)[number];

export const META_TEMPLATE_LIST_FIELDS =
  'id,name,language,status,category,components,rejected_reason,quality_score,parameter_format';
