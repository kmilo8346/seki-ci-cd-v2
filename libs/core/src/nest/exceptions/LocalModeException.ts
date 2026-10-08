import { HttpException, HttpStatus } from "@nestjs/common";

export class LocalModeException extends HttpException {
  constructor(
    repository: string,
  ) {
    super({
      error: {
        code: 'LOCAL_MODE_FOUND_EXCEPTION',
        message: 'local mode topic was found, The CI/CD with this topic only works in a developer machine context',
        repository
      },
    }, HttpStatus.UNPROCESSABLE_ENTITY)

  }
}