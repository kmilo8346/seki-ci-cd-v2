import { HttpException, HttpStatus } from '@nestjs/common';

export class RunnersRegistrationException extends HttpException {
  constructor(failed_runners: string[]) {
    super(
      {
        error: {
          code: 'RUNNERS_REGISTRATION_EXCEPTION',
          message: 'Failed registering runners in Control Plane database',
          failed_runners,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
