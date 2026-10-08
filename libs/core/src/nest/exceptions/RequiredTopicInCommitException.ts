import { HttpException, HttpStatus } from "@nestjs/common";

export class RequiredTopicInCommitException extends HttpException {
  constructor(
    repository: string,
    excepted: string[],
    received: string[]
  ) {
    super({
      error: {
        code: 'EXPECTED_TOPIC_IN_COMMIT',
        message: 'The repository does not have a valid seki topic, ci skipped...',
        repository,
        excepted,
        received
      },
    }, HttpStatus.UNPROCESSABLE_ENTITY)

  }
}