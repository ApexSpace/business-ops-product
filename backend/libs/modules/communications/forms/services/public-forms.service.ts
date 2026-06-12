import { HttpStatus, Injectable } from '@nestjs/common';
import { Form, FormStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { FormSubmissionResponseDto } from '../dto/form-submission-response.dto';
import { SubmitFormDto } from '../dto/submit-form.dto';
import { PublicFormConfigDto } from '../dto/form-embed.dto';
import { toPublicFormConfig } from '../mappers/form.mapper';
import { FormSubmissionsRepository } from '../repositories/form-submissions.repository';
import { FormsRepository } from '../repositories/forms.repository';
import {
  parseFormDefinition,
  sanitizeFormDefinition,
} from '../utils/form-definition.util';
import {
  sanitizeFormSubmissionData,
  validateFormSubmission,
} from '../utils/form-submission-validation.util';

export interface FormSubmissionMetadata {
  ip?: string;
  userAgent?: string;
  referer?: string;
}

@Injectable()
export class PublicFormsService {
  constructor(
    private readonly formsRepository: FormsRepository,
    private readonly submissionsRepository: FormSubmissionsRepository,
  ) {}

  async getConfig(publicKey: string): Promise<PublicFormConfigDto> {
    const form = await this.requirePublishedForm(publicKey);
    return toPublicFormConfig(form);
  }

  async submit(
    publicKey: string,
    dto: SubmitFormDto,
    metadata: FormSubmissionMetadata = {},
  ): Promise<FormSubmissionResponseDto> {
    const form = await this.requirePublishedForm(publicKey);
    const definition = sanitizeFormDefinition(
      parseFormDefinition(form) as { fields: unknown[]; settings: Record<string, unknown> },
    );
    const data =
      dto.data && typeof dto.data === 'object' && !Array.isArray(dto.data)
        ? dto.data
        : {};

    const errors = validateFormSubmission(definition.fields, data);
    if (errors.length > 0) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Please fix the highlighted fields',
        HttpStatus.BAD_REQUEST,
        Object.fromEntries(errors.map((error) => [error.field, [error.message]])),
      );
    }

    const sanitized = sanitizeFormSubmissionData(definition.fields, data);
    const submission = await this.submissionsRepository.create({
      business: { connect: { id: form.businessId } },
      form: { connect: { id: form.id } },
      publicKey: form.publicKey,
      data: sanitized as Prisma.InputJsonValue,
      metadata: {
        ip: metadata.ip ?? null,
        userAgent: metadata.userAgent ?? null,
        referer: metadata.referer ?? null,
      } as Prisma.InputJsonValue,
    });

    const redirectUrl =
      typeof definition.settings.redirectUrl === 'string' &&
      definition.settings.redirectUrl.trim()
        ? definition.settings.redirectUrl.trim()
        : null;

    return {
      id: submission.id,
      success: true,
      redirectUrl,
    };
  }

  private async requirePublishedForm(publicKey: string): Promise<Form> {
    const form = await this.formsRepository.findByPublicKey(publicKey.trim());
    if (!form || form.status !== FormStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.FORM_NOT_FOUND,
        'Form not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return form;
  }
}
