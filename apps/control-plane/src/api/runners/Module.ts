import { Module } from '@nestjs/common';
import { RunnersService } from './Service';
import { RunnersController } from './Controller';
import { HttpModule } from '@nestjs/axios';
import secrets from '../../config/secrets';

@Module({
  imports: [
    HttpModule.register({
      baseURL: secrets.CONTROL_PLANE_REQUEST_URL,
      headers: {
        Authorization: `Bearer ${secrets.CONTROL_PLANE_REQUEST_API_KEY}`,
      },
    }),
  ],
  controllers: [RunnersController],
  providers: [RunnersService],
  exports: [RunnersService],
})
export class RunnersModule {}
