import axios, { AxiosInstance } from 'axios';
import secrets from './config/secrets';
import { Logger } from '@nestjs/common';
import { Pipelines, ControlPlane } from '@seki-ci/models';

const TOTAL_TASKS_TO_FETCH = 30;
export class PendingsJob {
  private logger: Logger;
  private pipeliner: AxiosInstance;
  private controlPlane: AxiosInstance;

  constructor() {
    this.logger = new Logger('PendingsJob');
    this.pipeliner = axios.create({
      baseURL: secrets.PIPELINER_REQUEST_URL,
      timeout: 10 * 1000,
      headers: { Authorization: `Bearer ${secrets.ORGANIZATION_CLUSTER_API_KEY}` },
    });
    this.controlPlane = axios.create({
      baseURL: secrets.CONTROL_PLANE_REQUEST_URL,
      timeout: 10 * 1000,
      headers: { Authorization: `Bearer ${secrets.CONTROL_PLANE_REQUEST_API_KEY}` },
    });
  }

  async start() {
    console.log('');
    this.logger.log(`Searching pending tasks in Pipenliner...`);

    // 1- Getting pendings tasks from pipeliner
    const pendingTasks = await this.getPendingTasks();

    // 2- Send tasks to Control Plane to be created in server runners
    if (pendingTasks.pendings.length !== 0) {
      const statusReponses = await this.startTasks(pendingTasks);

      // 3- Update state of tasks in pipeliner
      await this.markAsStarted(statusReponses, pendingTasks);
    }
  }

  private async getPendingTasks() {
    try {
      const response = await this.pipeliner<Pipelines.TTaskPendings>('/tasks/pendings', {
        params: { limit: TOTAL_TASKS_TO_FETCH },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed getting pending tasks in Pipeliner');
      throw error;
    }
  }

  private async startTasks(tasks: Pipelines.TTaskPendings) {
    try {
      const response = await this.controlPlane.patch<ControlPlane.StatusResponse.TModel[]>(
        '/tasks',
        tasks
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed starting tasks in Control Plane');
      throw error;
    }
  }

  private async markAsStarted(
    statusReponses: ControlPlane.StatusResponse.TModel[],
    // used to show a resume log
    pendingTasks: Pipelines.TTaskPendings
  ) {
    try {
      const taskIds: Pipelines.TTaskId[] = [];
      const couldNotBeStarted: ControlPlane.StatusResponse.TModel[] = [];
      statusReponses.forEach((statusResponse) => {
        // Only update in pipeliner the state of task
        // that i know started in a runner server
        if (statusResponse.status === 200) {
          taskIds.push({
            commit_id: statusResponse.commit_id,
            task_id: statusResponse.task_id,
          });
        } else {
          couldNotBeStarted.push(statusResponse);
        }
      });

      await this.pipeliner.patch('/tasks', taskIds);

      // Show final stats
      const totalRunning = taskIds.length;
      const totalCouldNotBeStarted = pendingTasks.pendings.length - totalRunning;
      this.logger.log(`${totalRunning} Tasks were started in server runners successfully`);
      if (totalCouldNotBeStarted) {
        this.logger.warn(`${totalCouldNotBeStarted} Tasks could not be started`);
        this.logger.debug({
          tasks: pendingTasks.pendings,
          couldNotBeStarted,
        });
      }

      return couldNotBeStarted;
    } catch (error) {
      this.logger.error('Failed marking started tasks in Pipeliner');
      throw error;
    }
  }
}
