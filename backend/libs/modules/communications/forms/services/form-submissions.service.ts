import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { FormSubmissionListQueryDto } from '../dto/form-submission-list-query.dto';
import { toFormSubmissionListItemResponse } from '../mappers/form-submission.mapper';
import { FormSubmissionsRepository } from '../repositories/form-submissions.repository';
import { FormsRepository } from '../repositories/forms.repository';

@Injectable()
export class FormSubmissionsService {
  constructor(
    private readonly formsRepository: FormsRepository,
    private readonly submissionsRepository: FormSubmissionsRepository,
  ) {}

  async list(
    businessId: string,
    formId: string,
    query: FormSubmissionListQueryDto,
  ) {
    await this.requireForm(businessId, formId);

    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.submissionsRepository.findMany(
      businessId,
      formId,
      {
        skip,
        take,
        sortDir: query.sortDir ?? query.sortOrder,
      },
    );

    return {
      items: items.map(toFormSubmissionListItemResponse),
      meta: { total, page, limit },
    };
  }

  async remove(
    businessId: string,
    formId: string,
    submissionId: string,
  ): Promise<void> {
    await this.requireForm(businessId, formId);

    const deleted = await this.submissionsRepository.deleteById(
      businessId,
      formId,
      submissionId,
    );

    if (!deleted) {
      throw new AppException(
        ErrorCode.FORM_SUBMISSION_NOT_FOUND,
        'Form submission not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async requireForm(businessId: string, formId: string) {
    const form = await this.formsRepository.findById(businessId, formId);
    if (!form) {
      throw new AppException(
        ErrorCode.FORM_NOT_FOUND,
        'Form not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return form;
  }
}
