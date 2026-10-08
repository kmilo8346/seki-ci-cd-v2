import { Injectable, Logger } from '@nestjs/common';
import { Pipelines, ControlPlane } from '@seki-ci/models';
import { Redis, RedisService } from '@team_seki/nestjs-redis-module';
import { HttpService } from '@nestjs/axios';
import secrets from '../../config/secrets';
import RunnersService from '../runners/Service';

const RUNNING_TASKS_INDEX = 'RUNNING_TASKS';

@Injectable()
export class TasksService {
  private readonly logger: Logger;
  private readonly redisClient: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
    private readonly runnersService: RunnersService
  ) {
    this.logger = new Logger('TasksService');
    this.redisClient = this.redisService.getClient();
  }

  /**
   * Create many tasks in server runners.
   * For every running tasks the capacity managed by control plane
   * is decremented by one. The capacity is restored when the task finished
   * or the timeout of the task is completed.
   * @param taskList
   * @returns
   */
  async createMany(
    taskList: Pipelines.TTaskPendings
  ): Promise<ControlPlane.StatusResponse.TModel[]> {
    try {
      // Get running taks to calculate the available capacity
      // and get runners installed in control plane to route tasks
      let running = 0;
      const capacity = secrets.CONTROL_PLANE_TASKS_CAPACITY;
      const [allRunningIds, runners] = await Promise.all([
        // Get running ids to calculate total running
        this.getRunningIds(),
        // Get all runners to know endpoints and timeout
        this.runnersService.getAll(),
      ]);
      if (allRunningIds) {
        running = allRunningIds.length;
      }

      // Execute requests if we found runner to support the task
      // and if there are available capacity in pool of servers
      let availableCapacity = capacity - running;
      const requests: Promise<ControlPlane.StatusResponse.TModel>[] = [];
      const taskIndex: Record<
        string,
        { task: Pipelines.TTaskPending; runner: ControlPlane.Runner.TModel }
      > = {};
      taskList.pendings.forEach((task) => {
        const runnerId = `${task.step}_${task.sub_step}_${task.kind}`.toLowerCase();
        let runner = runners.find((runner) => runner.id === runnerId);

        if (!runner) {
          this.logger.warn(
            `Dont found runner(${runnerId}) for task ${task.task_id} in commit ${task.commit_id}. Redirecting to not found runner.`
          );

          runner = {
            id: 'not-found',
            timeout: 30,
            api_key: secrets.CONTROL_PLANE_REQUEST_API_KEY,
            endpoint: `${secrets.CONTROL_PLANE_REQUEST_URL}/runners/not-found`,
            registered_at: new Date().toISOString(),
          };
        }

        //  Set to be used later
        taskIndex[`${this.taskId(task)}`] = {
          task,
          runner,
        };

        // Execute tasks if enough capacity
        if (availableCapacity > 0) {
          // console.log('Calling runner', {
          //   step: task.step,
          //   substep: task.sub_step,
          //   kind: task.kind,
          //   command: task.command,
          //   endpoint: runner.endpoint,
          // });
          requests.push(
            // The first part of the execution is a random timeout between 0 a 2 seconds with 2 decimals
            // To reduce the problems of concurrence if the tasks are completed at the same time
            new Promise((resolve) => setTimeout(resolve, this.getRandomFloat(0, 2, 2) * 1000)).then(
              () => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const _runner = runner!;
                return this.httpService.axiosRef
                  .post<ControlPlane.StatusResponse.TModel>(
                    _runner.endpoint,
                    {
                      ...task,
                      meta_data: taskList.meta_data[task.commit_id],
                    },
                    {
                      headers: _runner.api_key
                        ? { Authorization: `Bearer ${_runner.api_key}` }
                        : {},
                    }
                  )
                  .then(() => ({
                    commit_id: task.commit_id,
                    task_id: task.task_id,
                    status: 200,
                  }))
                  .catch((error) => {
                    return {
                      commit_id: task.commit_id,
                      task_id: task.task_id,
                      status: 500,
                      message: error.message,
                    };
                  });
              }
            )
          );

          availableCapacity--;
        } else {
          requests.push(
            Promise.resolve<ControlPlane.StatusResponse.TModel>({
              commit_id: task.commit_id,
              task_id: task.task_id,
              status: 422,
            })
          );
        }
      });
      const requestReponses = await Promise.all(requests);

      // Set running task in redis to control capacity
      const multi = this.redisClient.multi();
      requestReponses.forEach((reponse) => {
        if (reponse.status === 200) {
          const { task, runner } = taskIndex[`${reponse.commit_id}_${reponse.task_id}`];

          multi.set(
            `${RUNNING_TASKS_INDEX}:${this.taskId(task)}`,
            JSON.stringify({ task, runner }),
            'EX',
            runner.timeout
          );
        }
      });
      await multi.exec();

      return requestReponses;
    } catch (error) {
      this.logger.error('Failed creating tasks in server runners', error);
      this.logger.debug({
        taskList,
      });

      throw error;
    }
  }

  /**
   * Complete task by commit id and autogenerated id
   * in pipeliner api(source of true)
   * @param commitId
   * @param id
   * @param model
   */
  async complete(commitId: string, id: number, model: Pipelines.TTaskUpdate): Promise<void> {
    try {
      // Delay random seconds the task to avoid the bug that happen
      // when the store procedure has to mark as pendind the next group of tasks
      const delay = this.getRandomFloat(0, 5, 3) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Update the source of true (pipeliner)
      await this.httpService.axiosRef.put(
        `${secrets.PIPELINER_REQUEST_URL}/tasks/${commitId}/${id}`,
        {
          ...model,
          // is always completed because its
          // called when finish the procesing
          state: 'COMPLETED',
        },
        {
          headers: {
            Authorization: `Bearer ${secrets.ORGANIZATION_CLUSTER_API_KEY}`,
          },
        }
      );
    } catch (error) {
      this.logger.error('Failed completing task in pipeliner', error);
      this.logger.debug({
        id,
        model,
      });
      throw error;
    } finally {
      // Always release the capacity to allow process more tasks
      await this.redisClient.del(
        `${RUNNING_TASKS_INDEX}:${this.taskId({
          commit_id: commitId,
          task_id: id,
        })}`
      );
    }
  }

  /**
   * Abort task by commit id and autogenerated id
   * in pipeliner api(source of true)
   * @param commitId
   * @param id
   */
  async abort(commitId: string, id: number): Promise<void> {
    try {
      // Delay 3 seconds the task to avoid the problem of concurrence
      // When the task is completed before the task is started
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update the source of true (pipeliner)
      await this.httpService.axiosRef.post(
        `${secrets.PIPELINER_REQUEST_URL}/tasks/${commitId}/${id}/abort`,
        {},
        {
          headers: {
            Authorization: `Bearer ${secrets.ORGANIZATION_CLUSTER_API_KEY}`,
          },
        }
      );
    } catch (error) {
      this.logger.error('Failed aborting task in pipeliner', error);
      this.logger.debug({
        commitId,
        id,
      });
      throw error;
    } finally {
      // Always release the capacity to allow process more tasks
      await this.redisClient.del(
        `${RUNNING_TASKS_INDEX}:${this.taskId({
          commit_id: commitId,
          task_id: id,
        })}`
      );
    }
  }

  /**
   * Get ids of tasks living in the server runners
   * @returns
   */
  async getRunningIds(): Promise<string[]> {
    return await this.redisClient.keys(`${RUNNING_TASKS_INDEX}:*`);
  }

  private taskId(keys: { commit_id: string; task_id: number }) {
    return `${keys.commit_id}_${keys.task_id}`.toLowerCase();
  }

  private getRandomFloat(min: number, max: number, decimals = 2) {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);

    return parseFloat(str);
  }
}

export default TasksService;
