import { Injectable } from '@nestjs/common';
import { FormSubmission, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class FormSubmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.FormSubmissionCreateInput): Promise<FormSubmission> {
    return this.prisma.formSubmission.create({ data });
  }

  findMany(
    businessId: string,
    formId: string,
    params: {
      skip: number;
      take: number;
      sortDir?: 'asc' | 'desc';
    },
  ): Promise<{ items: FormSubmission[]; total: number }> {
    const where = { businessId, formId };
    const sortDir = params.sortDir ?? 'desc';

    return this.prisma
      .$transaction([
        this.prisma.formSubmission.findMany({
          where,
          skip: params.skip,
          take: params.take,
          orderBy: { createdAt: sortDir },
        }),
        this.prisma.formSubmission.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  }

  deleteById(
    businessId: string,
    formId: string,
    submissionId: string,
  ): Promise<boolean> {
    return this.prisma.formSubmission
      .deleteMany({
        where: { id: submissionId, businessId, formId },
      })
      .then((result) => result.count > 0);
  }
}
