import { HttpException, HttpStatus } from '@nestjs/common';

export class OperationException extends HttpException {
  constructor(code: string, message: string) {
    super(
      {
        code: 'OPERATION_EXCEPTION',
        error: {
          code,
          message,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
