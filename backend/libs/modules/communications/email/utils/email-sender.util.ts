export const TRANSACTIONAL_EMAIL_LOCAL_PART = 'notifications';

/** Upgrades legacy no-reply defaults to notifications@. */
export function normalizeTransactionalDefaultFrom(
  from: string | null | undefined,
  sendingDomain: string,
): string | null {
  const trimmed = from?.trim();
  if (!trimmed) {
    return `${TRANSACTIONAL_EMAIL_LOCAL_PART}@${sendingDomain}`;
  }

  return trimmed
    .replace(/<no-reply@/gi, `<${TRANSACTIONAL_EMAIL_LOCAL_PART}@`)
    .replace(/^no-reply@/i, `${TRANSACTIONAL_EMAIL_LOCAL_PART}@`);
}

export function parseEmailFromAddress(from: string): {
  email: string;
  name: string | null;
} {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: trimmed, name: null };
}

/** Resolves the sender address used for transactional emails. */
export function resolveTransactionalEmailSender(params: {
  fromEmail?: string | null;
  fromName?: string | null;
  stepFromName?: string | null;
  defaultFrom?: string | null;
}): {
  email: string | null;
  name: string | null;
  usedDefaultSender: boolean;
  usedStepFromName: boolean;
} {
  const overrideEmail = params.fromEmail?.trim();
  const stepFromName = params.stepFromName?.trim();
  const workflowFromName = params.fromName?.trim();

  if (overrideEmail) {
    return {
      email: overrideEmail,
      name: stepFromName || workflowFromName || null,
      usedDefaultSender: false,
      usedStepFromName: Boolean(stepFromName),
    };
  }

  if (params.defaultFrom?.trim()) {
    const parsed = parseEmailFromAddress(params.defaultFrom);
    const resolvedName =
      stepFromName || workflowFromName || parsed.name || null;
    return {
      email: parsed.email,
      name: resolvedName,
      usedDefaultSender: !workflowFromName && !stepFromName,
      usedStepFromName: Boolean(stepFromName),
    };
  }

  return {
    email: null,
    name: stepFromName || workflowFromName || null,
    usedDefaultSender: false,
    usedStepFromName: Boolean(stepFromName),
  };
}
