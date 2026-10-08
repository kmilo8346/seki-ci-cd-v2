import { HttpException, HttpStatus } from '@nestjs/common';
import { Rest } from '@seki-ci/models';

export class GetAllPipelinesException extends HttpException {
  constructor(params: Rest.IQueryParams) {
    super(
      {
        error: {
          code: 'GET_ALL_PIPELINES_EXCEPTION',
          message: 'Failed getting all pipelines',
          params,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
