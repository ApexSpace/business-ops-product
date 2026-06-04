import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../constants';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function getPaginationParams(
  query: PaginationQueryDto,
): PaginationParams {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function getTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit) || 0;
}
