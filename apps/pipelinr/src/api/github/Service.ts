import { Injectable } from '@nestjs/common';
import { Github } from '@seki-ci/models';
import { Publisher } from '@team_seki/kafka-streamer-plugin';

import secrets from '../../config/secrets';

@Injectable()
export default class GithubService {

  async publish(pushEvent: Github.Webhooks.TPushEvent): Promise<void> {
    const publisher = new Publisher({
      topic: secrets.TOPIC_COMMIT_CREATED
    })

    await publisher.publish(pushEvent, {
      content_type: "application/json",
      id: pushEvent.head_commit.id,
    })
  }

}

