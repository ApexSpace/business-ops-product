import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessType, Form, FormStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { PrismaService } from '@app/core/database/prisma.service';
import { CreateUploadDto } from '@app/modules/storage/dto/create-upload.dto';
import { StorageService } from '@app/modules/storage/services/storage.service';
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

import { FormSubmissionConversationBridgeService } from './form-submission-conversation-bridge.service';

@Injectable()
export class PublicFormsService {
  constructor(
    private readonly formsRepository: FormsRepository,
    private readonly submissionsRepository: FormSubmissionsRepository,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly conversationBridge: FormSubmissionConversationBridgeService,
    private readonly prisma: PrismaService,
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
    const definition = sanitizeFormDefinition(parseFormDefinition(form));
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
        Object.fromEntries(
          errors.map((error) => [error.field, [error.message]]),
        ),
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
      },
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: form.businessId,
      action: 'form.submitted',
      entityType: 'FormSubmission',
      entityId: submission.id,
      metadata: {
        formId: form.id,
        submissionId: submission.id,
        submittedAt: submission.createdAt.toISOString(),
        formName: form.name,
      },
    });

    const createConversationOnSubmit =
      definition.settings.createConversationOnSubmit === true;
    const business = await this.prisma.business.findFirst({
      where: { id: form.businessId },
      select: { type: true },
    });
    const allowConversation =
      createConversationOnSubmit && business?.type !== BusinessType.INTERNAL;

    await this.conversationBridge.maybeCreateConversationFromSubmission({
      businessId: form.businessId,
      formId: form.id,
      formName: form.name,
      submissionId: submission.id,
      fields: definition.fields as Array<{ type?: string; name?: string }>,
      data: sanitized,
      enabled: allowConversation,
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

  async createUpload(publicKey: string, dto: CreateUploadDto) {
    const form = await this.requirePublishedForm(publicKey);
    return this.storageService.createBusinessUpload(form.businessId, dto, {
      auditActorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
    });
  }

  async confirmUpload(publicKey: string, fileAssetId: string) {
    const form = await this.requirePublishedForm(publicKey);
    return this.storageService.confirmBusinessUpload(
      form.businessId,
      fileAssetId,
      SYSTEM_AUDIT_ACTOR_SENTINEL,
    );
  }

  async failUpload(publicKey: string, fileAssetId: string, reason: string) {
    const form = await this.requirePublishedForm(publicKey);
    return this.storageService.failBusinessUpload(
      form.businessId,
      fileAssetId,
      reason,
      SYSTEM_AUDIT_ACTOR_SENTINEL,
    );
  }

  async getFileDownloadUrl(publicKey: string, fileAssetId: string) {
    const form = await this.requirePublishedForm(publicKey);
    return this.storageService.getDownloadUrl(form.businessId, fileAssetId);
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
