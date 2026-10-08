import { Injectable, Logger } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Pipelines } from '@seki-ci/models';
import { PostgresPlugin } from '@team_seki/postgres-plugin';
import { Knex } from 'knex';

const DATABASE_NAME = 'commits';
const COMMIT_TABLE_NAME = 'commits';
const COMMIT_TASKS_TABLE_NAME = 'commit_tasks';

@Injectable()
export class TasksService {
  private readonly logger: Logger;
  private postgres: Knex;

  constructor() {
    this.logger = new Logger('Tasks');
    this.postgres = new PostgresPlugin({
      database: DATABASE_NAME,
    }).getClient();
  }

  /**
   * Complete task by commit id and task id
   * @param commitId Commit Id
   * @param id Task Id
   * @param model Task Model (state && output)
   */
  async complete(commitId: string, id: number, model: Pipelines.TTaskUpdate): Promise<void> {
    try {
      // Complete a task into a commit ^^
      await this.postgres.raw('Call pa_complete_task(?,?,?,?,?)', [
        commitId, // Commit Id
        id, // Task Id
        model.status, // Status of the task
        model.markdown, // Output of the task (markdown??)
        JSON.stringify(model.meta_data || {}),
      ]);
      // this.logger.debug(`Task (${commitId} | ${id}) COMPLETED`);
    } catch (error) {
      this.logger.debug(error);
      throw new Nest.Exceptions.TasksException({
        context: 'Failed updating task by id to [complete]',
        error: error as Error,
        metadata: {
          commitId,
          taskId: id,
        },
      });
    }
  }

  /**
   * Abort task by commit id and task id
   * It mark the task as pending to be executed again
   * @param commitId Commit Id
   * @param id Task Id
   */
  async abort(commitId: string, id: number): Promise<void> {
    try {
      await this.postgres
        .table(COMMIT_TASKS_TABLE_NAME)
        .update({
          state: 'PENDING',
        })
        .where({ commit_id: commitId, task_id: id, state: 'STARTED' });
      // this.logger.debug(`Task (${commitId} | ${id}) ABORTED`);
    } catch (error) {
      this.logger.debug(error);
      throw new Nest.Exceptions.TasksException({
        context: 'Failed updating task by id to [PENDING]',
        error: error as Error,
        metadata: {
          commitId,
          taskId: id,
        },
      });
    }
  }

  /**
   * Mark as started the list of tasks
   * and mark as started the commit record
   * filtering with organization and environment
   * @param model
   */
  async markAsStarted(model: Pipelines.TTaskId[]) {
    try {
      await this.postgres.transaction(async (trx) => {
        // Mark tasks as started
        const ids = new Set();
        for (const taskId of model) {
          const { commit_id, task_id } = taskId;

          ids.add(commit_id);

          await trx
            .table(COMMIT_TASKS_TABLE_NAME)
            .update({
              state: 'STARTED',
              started_at: new Date().toISOString(),
            })
            .where({ commit_id, task_id, state: 'PENDING' });
        }

        // Mark commit record as started
        for (const id of ids) {
          await trx.table(COMMIT_TABLE_NAME).update({ state: 'STARTED' }).where({ id });
        }
      });
      // model.forEach((taskId) => {
      //   this.logger.debug(`Task (${taskId.commit_id} | ${taskId.task_id}) STARTED`);
      // });
    } catch (error) {
      throw new Nest.Exceptions.TasksException({
        context: 'Failed marking as started the list of tasks',
        error: error as Error,
        metadata: {
          model,
        },
      });
    }
  }

  /**
   * Get tasks pendings(state=PENDING)
   * in organization and environment
   * @param organization
   * @param environment
   * @returns Promise<Pipelines.TTask[]>
   */
  async getPendings(organization: string, environment: string, limit = 10) {
    try {
      const dbResult = await this.postgres
        .select<Array<Pipelines.TTask>>(
          'commit_id',
          'task_id',
          'step',
          'sub_step',
          'command',
          'kind',
          this.postgres.raw(
            `(SELECT meta_data FROM commits WHERE id = ${COMMIT_TASKS_TABLE_NAME}.commit_id) as meta_data`
          )
        )
        .from(COMMIT_TABLE_NAME)
        .join(
          COMMIT_TASKS_TABLE_NAME,
          `${COMMIT_TABLE_NAME}.id`,
          `${COMMIT_TASKS_TABLE_NAME}.commit_id`
        )
        .where({
          [`${COMMIT_TASKS_TABLE_NAME}.state`]: 'PENDING',
          organization: organization.toLocaleLowerCase(),
          environment: environment.toLocaleLowerCase(),
        })
        .limit(limit);

      // For perfomance , we reduce the commit in another object, to eficient the response
      // of this endpoint
      const meta_datas: Record<string, object> = {};
      const pendingsTasks = dbResult.map((pending) => {
        const { meta_data, ...pendingWithNoMetadata } = pending;
        meta_datas[pending.commit_id] = meta_data || {};
        return pendingWithNoMetadata;
      });

      return {
        pendings: pendingsTasks,
        meta_data: meta_datas,
      };
    } catch (error) {
      throw new Nest.Exceptions.TasksException({
        context: 'Failed getting pendings tasks',
        error: error as Error,
        metadata: {
          organization,
          environment,
        },
      });
    }
  }

  /**
   * Get tasks by commit id
   * @param commitId
   * @returns
   */
  async getTasksByCommitId(
    commitId: string,
    withMetadata = false,
    withMarkdown = false
  ): Promise<Array<Pipelines.TTaskNew>> {
    try {
      const select: string[] = [];
      Object.keys(Pipelines.TaskNewSchema.shape).forEach((key) => {
        if (key === 'meta_data' && !withMetadata) {
          return;
        }
        if (key === 'markdown' && !withMarkdown) {
          return;
        }

        select.push(key);
      });

      const tasks = await this.postgres
        .select<Array<Pipelines.TTaskNew>>(select)
        .from(COMMIT_TASKS_TABLE_NAME)
        .where({
          commit_id: commitId,
        });
      return tasks;
    } catch (error) {
      this.logger.debug(error);
      throw new Nest.Exceptions.TasksException({
        context: 'Failed getting tasks by commit id',
        error: error as Error,
        metadata: {
          commitId,
        },
      });
    }
  }
}

export default TasksService;
