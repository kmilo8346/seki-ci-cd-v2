import { Module } from '@nestjs/common';
import { JwtModule } from '@team_seki/nestjs-jwt-module';
import { PostgresModule } from '@team_seki/nestjs-postgres-module';
import { MongoModule } from '@team_seki/nestjs-mongodb-module';
import { join } from 'path';

import { HealthModule } from './health/health.module';
import { GitHubModule } from './github/Module';
import { TasksModule } from './tasks/Module';
import { PipelinesModule } from './pipelines/Module';

@Module({
  imports: [
    HealthModule,
    GitHubModule,
    TasksModule,
    PipelinesModule,
    PostgresModule.forRoot({
      database: 'commits',
    }),
    MongoModule.forRoot(),
    JwtModule.forRoot({
      allowedIssuer: 'seki',
      publicKeyPath: join(__dirname, 'config', 'iam_public_key.pub'),
      algorithm: 'RS512',
    }),
  ],
})
export class ApiModule {}
