import { HttpException, HttpStatus } from '@nestjs/common';

interface ConstructorSignature {
  context: string;
  error: Error;
  metadata: Record<string, object | string | number>;
}

export class TasksException extends HttpException {
  constructor(data: ConstructorSignature) {
    super(
      {
        error: {
          code: 'TASK_EXCEPTION',
          context: data.context,
          message: data.error.message,
          metadata: data.metadata,
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
