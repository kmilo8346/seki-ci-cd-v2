import { Module } from '@nestjs/common';

import GitHubService from './Service';
import GitHubController from './Controller';

@Module({
  imports: [],
  controllers: [GitHubController],
  providers: [GitHubService]
})

export class GitHubModule {}
