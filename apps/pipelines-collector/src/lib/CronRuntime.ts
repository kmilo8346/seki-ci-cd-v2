import { Logger } from '@nestjs/common';
import DevKit from '@team_seki/dev-kit';
import { CronJob } from 'cron';
import * as fs from 'fs';
import * as path from 'path';
import { BaseJob } from './BaseJob';

interface ILocalConfig {
  schedule?: string;
}

class CronRuntime {
  async run(job: BaseJob, localConfig?: ILocalConfig) {
    if (DevKit.isLocal()) {
      //--------------------------------------
      // Local logic to simulate cron job
      const projectName = path.basename(__dirname);
      const projectConfigPath = path.join(
        DevKit.getWorkspacePath(),
        '.seki',
        '.projects',
        `${projectName}.json`
      );
      const projectConfigJSON = JSON.parse(fs.readFileSync(projectConfigPath, 'utf-8'));
      const schedule = localConfig?.schedule || projectConfigJSON.settings.schedule;

      Logger.log(`[Local mode]: Simulating cron job (${schedule})`);
      new CronJob(schedule, job.start.bind(job), null, true);
      //--------------------------------------
    } else {
      try {
        await job.start();
        process.exit(0);
      } catch (error) {
        Logger.error('Failed executing job', error);

        process.exit(1);
      }
    }
  }
}

export default new CronRuntime();
