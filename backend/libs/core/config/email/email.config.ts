export interface EmailConfig {
  enabled: boolean;
  defaultFrom: string | null;
  defaultReplyTo: string | null;
  platform: {
    sendingDomain: string;
    inboundDomain: string;
  };
  resend: {
    apiKey: string | null;
    webhookSecret: string | null;
  };
  queue: {
    concurrency: number;
    jobAttempts: number;
    jobBackoffMs: number;
  };
}

export function resolveEmailConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmailConfig {
  const sendingDomain =
    env.RESEND_SENDING_DOMAIN?.trim() || 'notify.codesoltech.com';
  const inboundDomain =
    env.RESEND_INBOUND_DOMAIN?.trim() || sendingDomain;

  return {
    enabled: (env.EMAIL_ENABLED ?? 'false').toLowerCase() === 'true',
    defaultFrom: env.EMAIL_DEFAULT_FROM?.trim() || null,
    defaultReplyTo: env.EMAIL_DEFAULT_REPLY_TO?.trim() || null,
    platform: {
      sendingDomain,
      inboundDomain,
    },
    resend: {
      apiKey: env.RESEND_API_KEY?.trim() || null,
      webhookSecret: env.RESEND_WEBHOOK_SECRET?.trim() || null,
    },
    queue: {
      concurrency: parseInt(env.EMAIL_QUEUE_CONCURRENCY ?? '10', 10),
      jobAttempts: parseInt(env.EMAIL_JOB_ATTEMPTS ?? '5', 10),
      jobBackoffMs: parseInt(env.EMAIL_JOB_BACKOFF_MS ?? '2000', 10),
    },
  };
}
