import * as Joi from 'joi';

const DISPLAY_NAME_PATTERN = /^(.+?)\s*<([^>]+)>$/;

/** Extracts the email address from a plain or display-name from string. */
export function extractEmailAddress(from: string): string | null {
  const trimmed = from.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(DISPLAY_NAME_PATTERN);
  if (match) {
    const email = match[2]?.trim();
    return email || null;
  }

  return trimmed;
}

export const emailFromAddressSchema = Joi.string().custom((value, helpers) => {
  const email = extractEmailAddress(value);
  if (!email) {
    return helpers.error('any.invalid');
  }

  const { error } = Joi.string().email().validate(email);
  if (error) {
    return helpers.error('string.email');
  }

  return value.trim();
});
