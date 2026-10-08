import { HttpException, HttpStatus } from '@nestjs/common';

export class RunnerNotFoundException extends HttpException {
  constructor(id: string) {
    super(
      {
        error: {
          code: 'RUNNER_NOT_FOUND_EXCEPTION',
          message: 'Runner not found',
          id,
        },
      },
      HttpStatus.NOT_FOUND
    );
  }
}
