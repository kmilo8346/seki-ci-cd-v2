import { Module } from '@nestjs/common';
import { JwtModule } from '@team_seki/nestjs-jwt-module';
import { join } from 'path';

import { HealthModule } from './health/health.module';

@Module({
  imports: [
    HealthModule,
    JwtModule.forRoot({
      allowedIssuer: 'iam',
      publicKeyPath: join(__dirname, 'config', 'iam_public_key.pub'),
      algorithm: 'RS512',
    })
  ],
})
export class ApiModule {}
