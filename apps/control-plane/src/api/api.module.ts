import { Module } from '@nestjs/common';
import { RedisModule } from '@team_seki/nestjs-redis-module';
import { JwtModule } from '@team_seki/nestjs-jwt-module';
import { join } from 'path';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/Module';
import { ServerModule } from './server/Module';
import { RunnersModule } from './runners/Module';
import { OperationsModule } from './operations/Module';

@Module({
  imports: [
    HealthModule,
    TasksModule,
    ServerModule,
    RunnersModule,
    OperationsModule,
    RedisModule.forRoot({
      identifier: 'runners',
    }),
    JwtModule.forRoot({
      allowedIssuer: 'seki',
      publicKeyPath: join(__dirname, 'config', 'iam_public_key.pub'),
      algorithm: 'RS512',
    }),
  ],
})
export class ApiModule {}
