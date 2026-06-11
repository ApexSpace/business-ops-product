import * as Joi from 'joi';
import { emailFromAddressSchema } from './email-from.util';

export const emailEnvValidationSchema = {
  EMAIL_ENABLED: Joi.string().valid('true', 'false').default('false'),

  EMAIL_DEFAULT_FROM: Joi.when('EMAIL_ENABLED', {
    is: 'true',
    then: emailFromAddressSchema.required(),
    otherwise: Joi.string().optional(),
  }),

  EMAIL_DEFAULT_REPLY_TO: Joi.string().email().optional(),

  RESEND_SENDING_DOMAIN: Joi.string().hostname().optional(),
  RESEND_INBOUND_DOMAIN: Joi.string().hostname().optional(),

  RESEND_API_KEY: Joi.when('EMAIL_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  /** Required only when receiving Resend webhooks (Svix signing secret). Optional when EMAIL_ENABLED=false. */
  RESEND_WEBHOOK_SECRET: Joi.string().optional(),

  EMAIL_QUEUE_CONCURRENCY: Joi.number().integer().min(1).max(100).default(10),
  EMAIL_JOB_ATTEMPTS: Joi.number().integer().min(1).max(20).default(5),
  EMAIL_JOB_BACKOFF_MS: Joi.number()
    .integer()
    .min(100)
    .max(600000)
    .default(2000),
};
