import { Injectable } from '@nestjs/common';
import { Form, FormStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { FormListSortField } from '../dto/form-list-query.dto';

@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.FormWhereInput,
  ): Prisma.FormWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<Form | null> {
    return this.prisma.form.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findBySlug(businessId: string, slug: string): Promise<Form | null> {
    return this.prisma.form.findFirst({
      where: this.activeWhere(businessId, { slug }),
    });
  }

  findByPublicKey(publicKey: string): Promise<Form | null> {
    return this.prisma.form.findFirst({
      where: { publicKey, deletedAt: null },
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      status?: FormStatus;
      sortBy?: FormListSortField;
      sortDir?: 'asc' | 'desc';
    },
  ): Promise<{
    items: (Form & { _count: { submissions: number } })[];
    total: number;
  }> {
    const search = params.search?.trim();
    const where = this.activeWhere(
      businessId,
      {
        ...(params.status ? { status: params.status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    );

    const sortBy = params.sortBy ?? 'updatedAt';
    const sortDir = params.sortDir ?? 'desc';
    const orderBy: Prisma.FormOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: sortDir }
        : sortBy === 'createdAt'
          ? { createdAt: sortDir }
          : sortBy === 'status'
            ? { status: sortDir }
            : { updatedAt: sortDir };

    return this.prisma
      .$transaction([
        this.prisma.form.findMany({
          where,
          skip: params.skip,
          take: params.take,
          orderBy,
          include: {
            _count: { select: { submissions: true } },
          },
        }),
        this.prisma.form.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  }

  create(data: Prisma.FormCreateInput): Promise<Form> {
    return this.prisma.form.create({ data });
  }

  update(id: string, data: Prisma.FormUpdateInput): Promise<Form> {
    return this.prisma.form.update({ where: { id }, data });
  }

  softDelete(businessId: string, id: string): Promise<boolean> {
    return this.prisma.form
      .updateMany({
        where: this.activeWhere(businessId, { id }),
        data: { deletedAt: new Date(), status: FormStatus.ARCHIVED },
      })
      .then((r) => r.count > 0);
  }
}
