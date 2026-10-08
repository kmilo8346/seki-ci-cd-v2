import { CollectorJob } from './CollectorJob';
import CronRuntime from './lib/CronRuntime';

CronRuntime.run(new CollectorJob(), {
  // Uncomment to override in local
  // schedule: '*/30 * * * * *',
});
