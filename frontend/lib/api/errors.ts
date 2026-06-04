export type ApiErrorDetail = {
  field: string;
  messages: string[];
};

export type FieldErrors = Record<string, string[]>;

export function extractFieldErrors(
  details?: ApiErrorDetail[],
): FieldErrors | undefined {
  if (!details?.length) return undefined;
  const out: FieldErrors = {};
  for (const d of details) {
    if (d.field && d.messages?.length) {
      out[d.field] = d.messages;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  fieldErrors?: FieldErrors;

  constructor(
    message: string,
    status: number,
    options?: {
      code?: string;
      requestId?: string;
      fieldErrors?: FieldErrors;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = options?.code;
    this.requestId = options?.requestId;
    this.fieldErrors = options?.fieldErrors;
  }

  get supportHint(): string | undefined {
    if (!this.requestId) return undefined;
    return `Reference: ${this.requestId}`;
  }
}
