import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidOrganizationInCommitException extends HttpException {
  constructor(repository: string, excepted: string[], received: string) {
    super(
      {
        error: {
          code: 'INVALID_ORGANIZATION_IN_COMMIT',
          message: 'The organization of the commit is invalid',
          repository,
          excepted,
          received,
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
