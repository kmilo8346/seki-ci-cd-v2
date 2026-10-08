import { Nest } from '@seki-ci/core';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ControlPlane, Pipelines } from '@seki-ci/models';
import { RedisService, Redis } from '@team_seki/nestjs-redis-module';

const RUNNERS_INDEX = 'RUNNERS';

@Injectable()
export class RunnersService {
  private readonly logger: Logger;
  private readonly redisClient: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly httpService: HttpService
  ) {
    this.logger = new Logger('RunnersService');
    this.redisClient = this.redisService.getClient();
  }

  /**
   * Register many runners in Control Plane database
   * @param model
   */
  async registerMany(model: ControlPlane.Runner.TCreateModel[]) {
    try {
      const multi = this.redisClient.multi();

      model.forEach((createRunner) => {
        const runner: ControlPlane.Runner.TModel = {
          ...createRunner,
          registered_at: new Date().toISOString(),
        };

        // A runner definition live for one day
        // The runners auto register itself when boot
        // and every 5 minutes to keep the definition fresh
        multi.set(`${RUNNERS_INDEX}:${runner.id}`, JSON.stringify(runner), 'EX', 24 * 60 * 60);
      });

      await multi.exec();
    } catch (error) {
      this.logger.error('Failed registering a list of runners');
      this.logger.debug(error);

      throw new Nest.Exceptions.RunnersException('Failed registering runners', {
        runners: model.map((r) => r.id),
      });
    }
  }

  /**
   * Get a runner by id
   * @returns
   */
  async getById(id: string): Promise<ControlPlane.Runner.TModel> {
    try {
      const runner = await this.redisClient.get(`${RUNNERS_INDEX}:${id}`);

      if (!runner) {
        throw new Nest.Exceptions.RunnerNotFoundException(id);
      }

      return JSON.parse(runner);
    } catch (error) {
      this.logger.error('Failed getting runner by id');
      this.logger.debug({
        id,
        error,
      });

      if (error instanceof Nest.Exceptions.RunnerNotFoundException) {
        throw error;
      }

      throw new Nest.Exceptions.RunnersException('Failed getting runner by id', {
        id,
      });
    }
  }

  /**
   * Get all runners registered in control plane
   * @returns
   */
  async getAll() {
    try {
      const keys = await this.redisClient.keys(`${RUNNERS_INDEX}:*`);

      // Added because mget
      // dont support an empty array of keys
      if (keys.length === 0) {
        return [];
      }

      const rawRunners = await this.redisClient.mget(keys);

      const runners: ControlPlane.Runner.TModel[] = [];
      rawRunners.forEach((raw) => {
        if (raw) {
          runners.push(JSON.parse(raw));
        }
      });

      return runners;
    } catch (error) {
      this.logger.error('Failed getting all runners');
      this.logger.debug(error);

      throw new Nest.Exceptions.RunnersException('Failed getting all runners', {});
    }
  }

  /**
   * Start not found runner
   * @param model
   */
  async startNotFound(model: Pipelines.TTaskPendingWithMetadata) {
    await this.httpService.axiosRef.put(`/tasks/${model.commit_id}/${model.task_id}`, {
      status: 'ERROR',
      markdown: `
# Step not implemented

This markdown is printed when a step is not implemented yet

## Status: **FAIL**

## Error Details

Step **${model.step}_${model.sub_step}_${model.kind}** not implemented in the Seki CI. Please contact to Seki Teams to implement the step.
      `,
    });
  }
}

export default RunnersService;
