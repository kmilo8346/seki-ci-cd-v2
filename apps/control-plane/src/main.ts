import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'body-parser';

import { ApiModule } from './api/api.module';
import secrets from './config/secrets';

 async function bootstrap() {
   const app = await NestFactory.create(ApiModule);
   const port = secrets.CONTROL_PLANE_SERVER_PORT;

   app.use(json({ limit: '30mb' }));
   await app.listen(port);

   Logger.log(`${secrets.PRODUCT_NAME}: 🚀 Api is running on: http://localhost:${port}`);
 }

 bootstrap();
