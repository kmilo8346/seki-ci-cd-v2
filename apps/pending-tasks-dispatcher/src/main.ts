import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ApiModule } from './api/api.module';
import secrets from './config/secrets';
import { PendingsJob } from './PendingsJob';

const CRON_TIME_IN_SECONDS = 5;

const runCronJob = () => {
  const logger = new Logger('CronJob');

  const timeoutId = setTimeout(async () => {
    clearTimeout(timeoutId);
    const job = new PendingsJob();

    try {
      await job.start();
    } catch (error) {
      logger.error('Failed executing job');
      logger.debug({
        error,
      });
    } finally {
      runCronJob();
    }
  }, CRON_TIME_IN_SECONDS * 1000);
};

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  const port = secrets.PENDING_TASKS_DISPATCHER_SERVER_PORT;

  await app.listen(port);

  Logger.log(`${secrets.PRODUCT_NAME}: 🚀 Api is running on: http://localhost:${port}`);

  runCronJob();
}

bootstrap();
