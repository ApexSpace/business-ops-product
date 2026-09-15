import { Form, FormStatus } from '@prisma/client';
import {
  FormEmbedResponseDto,
  PublicFormConfigDto,
} from '../dto/form-embed.dto';
import {
  FormListItemResponseDto,
  FormResponseDto,
} from '../dto/form-response.dto';
import {
  countFormBuilderFields,
  parseFormDefinition,
} from '../utils/form-definition.util';
import {
  buildFormHostedPageUrl,
  buildFormScriptUrl,
  buildFormWidgetUrl,
} from '../utils/form-public-key.util';

export type ApiFormStatus = 'draft' | 'published' | 'archived';

const STATUS_TO_API: Record<FormStatus, ApiFormStatus> = {
  [FormStatus.DRAFT]: 'draft',
  [FormStatus.PUBLISHED]: 'published',
  [FormStatus.ARCHIVED]: 'archived',
};

const STATUS_FROM_API: Record<ApiFormStatus, FormStatus> = {
  draft: FormStatus.DRAFT,
  published: FormStatus.PUBLISHED,
  archived: FormStatus.ARCHIVED,
};

export function toApiFormStatus(status: FormStatus): ApiFormStatus {
  return STATUS_TO_API[status];
}

export function fromApiFormStatus(status: ApiFormStatus): FormStatus {
  return STATUS_FROM_API[status];
}

type FormListSource = Form & {
  _count?: { submissions: number };
};

function baseFields(form: Form, fieldCount: number) {
  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    publicKey: form.publicKey,
    status: toApiFormStatus(form.status),
    fieldCount,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    publishedAt: form.publishedAt?.toISOString() ?? null,
    archivedAt: form.archivedAt?.toISOString() ?? null,
  };
}

export function toFormListItemResponse(
  form: FormListSource,
): FormListItemResponseDto {
  const definition = parseFormDefinition(form);
  return {
    ...baseFields(form, countFormBuilderFields(definition.fields)),
    submissionCount: form._count?.submissions ?? 0,
  };
}

export function toFormEmbed(params: {
  backendPublicUrl: string;
  frontendUrl: string;
  publicKey: string;
  slug: string | null;
  isPublished: boolean;
}): FormEmbedResponseDto {
  const { backendPublicUrl, frontendUrl, publicKey, slug, isPublished } =
    params;
  const scriptUrl = buildFormScriptUrl(backendPublicUrl);
  const iframeUrl = buildFormWidgetUrl(backendPublicUrl, publicKey);
  const hostedPageUrl = buildFormHostedPageUrl(frontendUrl, publicKey);
  const embedCode = `<script type="text/javascript" src="${scriptUrl}"></script>
<iframe class="form-embed-widget" src="${iframeUrl}" data-form-key="${publicKey}" frameborder="0" scrolling="no" style="min-width:100%;width:100%;border:0;" loading="lazy" title="Form"></iframe>`;
  const iframeEmbed = `<iframe src="${iframeUrl}" style="border:0;width:100%;min-height:480px;" title="Form"></iframe>`;

  return {
    publicKey,
    slug,
    scriptUrl,
    iframeUrl,
    hostedPageUrl,
    embedCode,
    iframeEmbed,
    isPublished,
  };
}

export function toPublicFormConfig(form: Form): PublicFormConfigDto {
  const definition = parseFormDefinition(form);
  return {
    publicKey: form.publicKey,
    slug: form.slug,
    name: form.name,
    definition: {
      fields: definition.fields,
      settings: definition.settings,
    },
  };
}

export function toFormResponse(form: Form): FormResponseDto {
  const definition = parseFormDefinition(form);
  const metadata =
    form.metadata &&
    typeof form.metadata === 'object' &&
    !Array.isArray(form.metadata)
      ? (form.metadata as Record<string, unknown>)
      : null;

  return {
    ...baseFields(form, countFormBuilderFields(definition.fields)),
    definition: {
      fields: definition.fields,
      settings: definition.settings,
    },
    metadata,
  };
}
