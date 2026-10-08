import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'body-parser';

import { ApiModule } from './api/api.module';
import secrets from './config/secrets';
import constants from './constants';

 async function bootstrap() {
   const app = await NestFactory.create(ApiModule);
   const port = secrets.PIPELINR_SERVER_PORT;

   app.use(json({ limit: '30mb' }));
   await app.listen(port);

   Logger.log(`${constants.ARTIFACT_NAME}: 🚀 Api is running on: http://localhost:${port}`);
 }

 bootstrap();
