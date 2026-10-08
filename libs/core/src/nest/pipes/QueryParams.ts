import { Injectable, PipeTransform } from '@nestjs/common';
import * as Models from '@seki-ci/models';

@Injectable()
export class QueryParams implements PipeTransform {
  transform(value: Record<string, string>): Models.Rest.IQueryParams {
    let offset = 0;
    if (value['offset']) {
      const parsed = parseInt(value['offset']);
      if (!isNaN(parsed)) {
        offset = parsed;
      }
    }

    let limit = 10;
    if (value['limit']) {
      const parsed = parseInt(value['limit']);
      if (!isNaN(parsed)) {
        limit = parsed;
      }
    }

    const search = value['search'];

    // Filters is parsed by default by NestJS
    const filters = value['filters'] ? (value['filters'] as unknown as object) : undefined;
    const sort = value['sort']
      ? (value['sort'] as unknown as Record<string, 'asc' | 'desc'>)
      : undefined;

    return {
      offset,
      limit,
      search,
      filters,
      sort,
    };
  }
}
