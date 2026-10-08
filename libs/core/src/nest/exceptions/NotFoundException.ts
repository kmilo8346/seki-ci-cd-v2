import { HttpException, HttpStatus } from '@nestjs/common';

export class NotFoundException extends HttpException {
  constructor(
    context: string,
    metadata:Record<string,object|string|number> 
  ) {
    super(
      {
        error: {
          code: 'NOT_FOUND_EXCEPTION',
          context,
          metadata
        },
      },
      HttpStatus.NOT_FOUND
    );
  }
}
