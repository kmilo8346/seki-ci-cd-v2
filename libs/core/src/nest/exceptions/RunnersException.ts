import { HttpException, HttpStatus } from '@nestjs/common';

export class RunnersException extends HttpException {
  constructor(message: string, context: Record<string, unknown>) {
    super(
      {
        error: {
          code: 'RUNNERS_EXCEPTION',
          message,
          context,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
