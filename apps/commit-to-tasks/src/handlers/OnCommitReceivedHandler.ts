import { Logging, Runners, Templates } from '@seki-ci/core';
import { Github, Pipelines, Seki, Topics } from '@seki-ci/models';
import { IHandler, IMessage } from '@team_seki/kafka-streamer-plugin';
import { PostgresPlugin } from '@team_seki/postgres-plugin';
import * as colors from 'ansi-colors';
import { Knex } from 'knex';
import * as md5 from 'md5';

import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import secrets from '../config/secrets';
import constants from '../constants';
import * as Clients from './../clients';

// CREATE TABLE IF NOT EXISTS!
const DATABASE_NAME = 'commits';
const COMMIT_TABLE_NAME = 'commits';
const COMMIT_TASKS_TABLE_NAME = 'commit_tasks';

export default class Handler extends IHandler {
  private readonly templates = {
    workspace_error: new Templates.Renderer(constants.TEMPLATE_WORKSPACE_ERROR),
    workspace_success: new Templates.Renderer(constants.TEMPLATE_WORKSPACE_SUCCESS),
  };
  private readonly logger = new Logging.Logger({ name: 'Commit to tasks' });
  private postgres: Knex;

  constructor() {
    super({
      topic: secrets.TOPIC_COMMIT_CREATED,
      artifactName: `${constants.ARTIFACT_NAME}-${secrets.TOPIC_COMMIT_CREATED}`,
      maxNumberOfFailures: 5,
    });

    this.postgres = new PostgresPlugin({
      database: DATABASE_NAME,
    }).getClient();
  }

  async onReady(): Promise<void> {
    this.logger.log(
      `OnCommitReceivedHandler Handler: ready and listening from ${this.props.topic}`
    );

    await this.createSchemaOnPostgres();
  }

  async handleMessage(message: IMessage): Promise<void> {
    // console.debug('Message received: ', message);

    const body = message.body as Github.Webhooks.TPushEvent;

    await this.convertoToTasks(body);
  }

  /**
   * Warming up for database in postgress
   *  - Create Tables
   * @param database database name
   * @param client knex client
   * @param logger logger to log messages
   */
  private async createSchemaOnPostgres() {
    const dbFilesPath = join(__dirname, 'db');
    const files = ['tb_commits.sql', 'tb_commit_tasks.sql', 'pa_complete_task.sql'];

    for (const file of files) {
      const filePath = join(dbFilesPath, file);
      let state = 'DONE';
      if (existsSync(filePath)) {
        const sql = readFileSync(filePath, 'utf-8').toString();
        await this.postgres.schema.raw(sql);
      } else {
        state = 'FILE_NOT_FOUND';
      }

      this.logger.log(
        `script ${colors.bold(file)}: ${colors[state === 'DONE' ? 'green' : 'red'](`[${state}]`)}`
      );
    }
  }

  async convertoToTasks(gitEvent: Github.Webhooks.TPushEvent): Promise<void> {
    const {
      organization: { login: organization },
      repository: { name: product },
      head_commit: {
        id: commit,
        message: commitMessage,
        committer: { name: committerName, email: committerEmail },
      },
    } = gitEvent;

    const cLogger = this.logger.withContext(commit);
    let repoFullPath;
    let incrementalTaskId = 0;

    try {
      // --------------------------------------
      // STEP 1:
      //    Get some values according of the
      //    commit information
      // --------------------------------------
      const isProduction = gitEvent.ref.includes(constants.REF_TAG_REPLACER);
      const stage = isProduction ? 'production' : 'staging';
      const trigger = isProduction ? 'tag' : 'commit';
      let reference_id = gitEvent.head_commit.id;
      if (isProduction) {
        // Extract from the ref the tag
        // Format: refs/tags/v3.14.1
        reference_id = gitEvent.ref.replace(constants.REF_TAG_REPLACER, '');
      }

      //------------------------------------------------------------------------
      const commitTimer = cLogger.startTimer();
      cLogger.log(`[Git] Check if commit exists...`);
      const gitRepo = Clients.Github.fromRepo(organization, product);
      const gitRepoCommit = await gitRepo.commit(commit);
      const commitExists = await gitRepoCommit.exists();
      if (!commitExists) {
        cLogger.error('Git commit not exists in repository');
        cLogger.debug({
          organization,
          product,
          commit,
        });
        return;
      }
      commitTimer.stop();
      cLogger.log(`[Git] Commit exists ${commitTimer.toString()}`);
      //------------------------------------------------------------------------

      //------------------------------------------------------------------------
      // --[ CREATE PIPELINE IN POSTGRES (DATABASE)
      //    Create the pipeline data into db, because the commit exists
      //    and everything until this point is OK
      //
      const initialMetadata: Pipelines.TCommitMetadata[] = [];
      const pipelineHash = md5(`${commit}|${reference_id}`);
      const gitMetadata: Pipelines.TCommitMetadata = {
        step: 'VA',
        sub_step: 'GIT',
        kind: 'git',
        command: 'info',
        meta_data: {
          product,
          commit,
          committer: {
            message: commitMessage,
            email: committerEmail,
            name: committerName,
          },
          organization,
          stage: stage,
          event: trigger,
          ref: reference_id,
        },
      };

      initialMetadata.push(gitMetadata);

      await this.postgres.transaction(async (trx) => {
        await trx.table<Pipelines.TCommit>(COMMIT_TABLE_NAME).insert(
          Pipelines.CommitSchema.parse({
            id: pipelineHash,
            commit: commit,
            commit_message: commitMessage,
            environment: stage,
            trigger: trigger,
            organization,
            reference: reference_id,
            repository: product,
            trigger_by: `${committerName}<${committerEmail}>`,
          } as Pipelines.TCommit)
        );

        // "Fake Step", to save all git data for later retrieve
        incrementalTaskId++;
        await trx.table<Pipelines.TTaskNew>(COMMIT_TASKS_TABLE_NAME).insert(
          Pipelines.TaskNewSchema.parse({
            commit_id: pipelineHash,
            task_id: incrementalTaskId,
            step: 'VA',
            sub_step: 'GIT',
            kind: 'git',
            command: 'info',
            meta_data: JSON.stringify(gitMetadata.meta_data),
            state: 'COMPLETED',
            status: 'SUCCESS',
            depends_on: 'SC',
          } as Pipelines.TTaskNew)
        );
      });
      //------------------------------------------------------------------------

      //------------------------------------------------------------------------
      const cloningTimer = cLogger.startTimer();
      cLogger.log(`[Git] Cloning repository ...`);
      repoFullPath = await gitRepoCommit.clone();

      cloningTimer.stop();
      cLogger.log(`[Git] Cloned successfully ${cloningTimer.toString()}`);
      //------------------------------------------------------------------------

      //------------------------------------------------------------------------
      const workspaceTimer = cLogger.startTimer();
      cLogger.log('[Workspace] Getting information...');
      const runner = new Runners.ShellRunner();
      const result = await runner.execute(`seki workspace get --with-hashes -p=false`, {
        cwd: repoFullPath,
      });

      if (!result.success) {
        const workspaceCmdOutput = `${result.stderr}\n${result.stdout}`;
        // --[ Create a scaffold with the error
        //      If fails pre check , start a ci / cd operation event flow,
        //      but immediately complete with a fail status, to notify to the
        //      developer user
        //
        await this.postgres.transaction(async (trx) => {
          incrementalTaskId++;
          await trx.table<Pipelines.TTaskNew>(COMMIT_TASKS_TABLE_NAME).insert(
            Pipelines.TaskNewSchema.parse({
              commit_id: pipelineHash,
              task_id: incrementalTaskId,
              step: 'VA',
              sub_step: 'WORKSPACE',
              depends_on: 'SC',
              state: 'COMPLETED',
              status: 'ERROR',
              meta_data: JSON.stringify({
                message: workspaceCmdOutput,
              }),
              command: 'workspace',
              kind: 'validation',
              markdown: this.templates.workspace_error.render({
                product,
                commit,
                error: workspaceCmdOutput,
              }),
            } as Pipelines.TTaskNew)
          );

          await trx
            .table<Pipelines.TCommit>(COMMIT_TABLE_NAME)
            .update({ state: 'COMPLETED' })
            .where({ commit });
        });

        // -----------------------------------------------------------------------
        // Send a final message to notify the NO OK status of this pipe step
        cLogger.log(`Commit to Tasks: ${colors.bold(product)} ${colors.red('[FAILED]')}`);
        // ---------------------------------------------------------------------------
        return;
      }

      workspaceTimer.stop();
      cLogger.log(`[Workspace] Information extracted ${workspaceTimer.toString()}`);
      //------------------------------------------------------------------------

      //------------------------------------------------------------------------
      // --[ GET WORKSPACE DATA TO CREATE THE TASKS
      //      Get all the projects and information in the product
      //      and split into tasks
      //
      const workspaceData = JSON.parse(result.data) as Seki.Workspace.IWorkspace;
      //------------------------------------------------------------------------

      // ------------------------------------------------------------------------
      // Extract all the cloud component into a Cloud component array to send into
      // infrastructure pipe
      const cloudComponents: Topics.OnBuild.ICloudComponentBuild[] = workspaceData.cloud.components;
      // ------------------------------------------------------------------------

      const targetWithGoldenRequires: string[] = [];
      const targetWithoutGoldenRequires: string[] = [];

      const targets: Record<string, Topics.OnBuild.ITargetBuild> = {};
      workspaceData.projects
        .filter((p) => p.configuration.buildable === true && p.configuration.skip === false)
        .forEach((project) => {
          if (project.tags?.includes(constants.GOLDEN_REQUIRED_TAG)) {
            targetWithGoldenRequires.push(project.name);
          } else {
            targetWithoutGoldenRequires.push(project.name);
          }

          if (project.configuration.buildable) {
            const options = project.configuration.options as {
              stages?: Record<string, Seki.IStage>;
            };

            targets[project.name] = {
              name: project.name,
              output_path: project.configuration.options.outputPath,
              build_command: `npx nx run ${project.name}:build`,
              kind: project.configuration.kind,
              sha1: project.hash,
              buildable: project.configuration.buildable,
              publishable: project.configuration.publishable,
              tags: project.tags,
              metadata: {
                ...project.configuration.options,
                stage: options.stages ? options.stages[stage] : undefined,
              },
            };
          }
        });
      //------------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // Create te scaffold for this Pipeline
      const taskItems: Array<Partial<Pipelines.TTaskNew>> = [];

      // "Fake Step", to save all workspace data for later retrieve
      const workspaceMetadata: Pipelines.TCommitMetadata = {
        step: 'VA',
        sub_step: 'WORKSPACE',
        kind: 'workspace',
        command: 'info',
        meta_data: workspaceData,
      };

      initialMetadata.push(workspaceMetadata);

      taskItems.push({
        step: 'VA',
        sub_step: 'WORKSPACE',
        kind: 'workspace',
        command: 'info',
        meta_data: JSON.stringify(workspaceMetadata.meta_data),
        state: 'COMPLETED',
        status: 'SUCCESS',
        depends_on: 'SC',
        markdown: this.templates.workspace_success.render({
          product,
          commit,
        }),
      });

      // "Fake Step", to save all targets data for later retrieve
      const projectsMetadata: Pipelines.TCommitMetadata = {
        step: 'VA',
        sub_step: 'PROJECTS',
        kind: 'projects',
        command: 'info',
        meta_data: targets,
      };

      initialMetadata.push(projectsMetadata);

      taskItems.push({
        step: 'VA',
        sub_step: 'PROJECTS',
        kind: 'projects',
        command: 'info',
        meta_data: JSON.stringify(projectsMetadata.meta_data),
        state: 'COMPLETED',
        status: 'SUCCESS',
        depends_on: 'SC',
      });

      // "Fake Step", to save all cloud component data for later retrieve
      const cloudComponentsMetadata: Pipelines.TCommitMetadata = {
        step: 'VA',
        sub_step: 'CLOUD_COMPONENTS',
        kind: 'cloud_components',
        command: 'info',
        meta_data: cloudComponents.reduce<{
          [key: string]: Seki.Cloud.ICloudComponentRc;
        }>((cloudComponents, cloudComponent) => {
          const key = `${cloudComponent.kind}_${cloudComponent.identifier}`;
          const { identifier, kind, version, properties, output, srcRepoUrl, creator } =
            cloudComponent;
          cloudComponents[key] = {
            identifier,
            kind,
            version,
            properties,
            output,
            srcRepoUrl,
            creator,
          };
          return cloudComponents;
        }, {}),
      };

      initialMetadata.push(cloudComponentsMetadata);

      taskItems.push({
        step: 'VA',
        sub_step: 'CLOUD_COMPONENTS',
        kind: 'cloud_components',
        command: 'info',
        meta_data: JSON.stringify(cloudComponentsMetadata.meta_data),
        state: 'COMPLETED',
        status: 'SUCCESS',
        depends_on: 'SC',
      });

      taskItems.push({
        step: 'VA',
        sub_step: 'SECRETS',
        kind: 'validation',
        command: 'secrets',
        depends_on: 'SC',
      });
      taskItems.push({
        step: 'VA',
        sub_step: 'NAMESPACE',
        kind: 'validation',
        command: 'kubernets',
        depends_on: 'SC',
      });

      // --[ If at least had one target with golden required
      if (targetWithGoldenRequires.length > 0) {
        // Always add the CI GOLDEN event if has a target with a golden required
        taskItems.push({
          step: 'BS',
          sub_step: 'GOLDEN_DEPENDENCIES',
          command: 'dockerize',
          kind: 'golden',
          depends_on: 'VA',
        });

        // Add all the projects as substasks depending of the golden image ^^, marking the
        // GOLDEN as its required dependency
        for (const name of Object.values(targetWithGoldenRequires)) {
          const targetData = targets[name];
          taskItems.push({
            step: 'GD',
            sub_step: 'BUILD',
            depends_on: 'BS',
            kind: targetData.kind.toLowerCase(),
            command: name,
          });
        }
      }

      // --[ If at least had one target without golden required
      if (targetWithoutGoldenRequires.length > 0) {
        // Add all the projects as substasks that are not depending of a golden image
        for (const name of Object.values(targetWithoutGoldenRequires)) {
          const targetData = targets[name];
          taskItems.push({
            step: 'BG',
            sub_step: 'BUILD',
            depends_on: 'VA',
            kind: targetData.kind.toLowerCase(),
            command: name,
          });
        }
      }
      // ------------------------------------------------------------------------

      // --[ If at least had one cloud component
      if (cloudComponents.length > 0) {
        // Add all the infrastructure to build
        for (const component of Object.values(cloudComponents)) {
          taskItems.push({
            step: 'CI',
            sub_step: 'CREATE',
            depends_on: 'VA',
            kind: component.kind.toLowerCase(),
            command: component.identifier,
          });
        }
      }

      // ------------------------------------------------------------------------
      // Add all target that require of golden to test
      for (const name of Object.values(targetWithGoldenRequires)) {
        const targetData = targets[name];
        taskItems.push({
          step: 'TS',
          sub_step: 'TEST',
          depends_on: 'GD',
          kind: targetData.kind.toLowerCase(),
          command: targetData.name,
        });
      }

      // Add all target that not require of golden to test
      for (const name of Object.values(targetWithoutGoldenRequires)) {
        const targetData = targets[name];
        taskItems.push({
          step: 'TS',
          sub_step: 'TEST',
          depends_on: 'BG',
          kind: targetData.kind.toLowerCase(),
          command: targetData.name,
        });
      }

      // Add all infrastructure to test
      if (cloudComponents.length > 0) {
        for (const component of Object.values(cloudComponents)) {
          taskItems.push({
            step: 'TS',
            sub_step: 'TEST',
            depends_on: 'CI',
            kind: component.kind.toLowerCase(),
            command: component.identifier,
          });
        }
      }
      // ------------------------------------------------------------------------

      // Add all deploy target to scaffold
      for (const [key, value] of Object.entries(targets)) {
        taskItems.push({
          step: 'CD',
          sub_step: 'DEPLOY',
          depends_on: 'TS',
          kind: value.kind.toLowerCase(),
          command: key,
        });
      }

      // ------------------------------------------------------------------------
      // --[ Add destroy tasks to scaffold

      // > Get before pipeline if exist.
      // Maybe is the firts run and not before exists
      // if (beforeCommit) {
      //   const beforePipeline = await this.postgres
      //     .select<Array<Pipelines.TCommit>>(['id', 'meta_data'])
      //     .from(COMMIT_TABLE_NAME)
      //     .where({
      //       commit: beforeCommit,
      //       environment: stage,
      //     })
      //     .orderBy('created_at', 'desc')
      //     .limit(1)
      //     .first();

      //   if (beforePipeline) {
      //     // Find workspace data in before pipeline
      //     // To compare and detect if I need to destroy resources
      //     const match = beforePipeline.meta_data?.find(
      //       (meta) => meta.step === 'VA' && meta.sub_step === 'WORKSPACE'
      //     )?.meta_data;

      //     // Its posible found a pipeline without metadata
      //     // Maybe the get metadata fail. In that case I ignore and continue
      //     if (match) {
      //       const beforeWorkspaceData = match as Seki.Workspace.IWorkspace;

      //       // ELIMINATION = (exist in before but not in current)

      //       // Check project eliminations
      //       beforeWorkspaceData.projects.forEach((beforeProject) => {
      //         const exists = workspaceData.projects.find(
      //           (project) => project.name === beforeProject.name
      //         );

      //         if (!exists) {
      //           // There is a elimination
      //           taskItems.push({
      //             step: 'DR',
      //             sub_step: 'PROJECT',
      //             kind: beforeProject.configuration.kind.toLocaleLowerCase(),
      //             command: beforeProject.name,
      //             depends_on: 'VA',
      //           });
      //         }
      //       });

      //       // Check cloud component eliminations
      //       // beforeWorkspaceData.cloud.components.forEach((beforeComponent) => {
      //       //   const exists = workspaceData.cloud.components.find(
      //       //     (component) => component.identifier === beforeComponent.identifier
      //       //   );

      //       //   if (!exists) {
      //       //     // There is a elimination
      //       //     taskItems.push({
      //       //       step: 'DR',
      //       //       sub_step: 'CLOUD_COMPONENT',
      //       //       kind: beforeComponent.kind,
      //       //       command: beforeComponent.identifier,
      //       //       depends_on: 'VA',
      //       //     });
      //       //   }
      //       // });
      //     }

      //     // // We only destroy CI (Cloud Components) AND CD (Proyect Types)
      //     // const tasks = taskItems.filter(
      //     //   (task) =>
      //     //     (task.step === 'CI' && task.sub_step === 'CREATE') ||
      //     //     (task.step === 'CD' && task.sub_step === 'DEPLOY')
      //     // );
      //     // const beforeTasks = await this.postgres
      //     //   .select<Array<Pipelines.TTaskNew>>(['step', 'sub_step', 'kind', 'command'])
      //     //   .from(COMMIT_TASKS_TABLE_NAME)
      //     //   .where({
      //     //     commit_id: beforePipeline.id,
      //     //     step: 'CI',
      //     //     sub_step: 'CREATE',
      //     //   })
      //     //   .orWhere({
      //     //     commit_id: beforePipeline.id,
      //     //     step: 'CD',
      //     //     sub_step: 'DEPLOY',
      //     //   });

      //     // // > Compare tasks to detect when is needed destroy
      //     // beforeTasks.forEach((beforeTask) => {
      //     //   const exists = tasks.find(
      //     //     (task) =>
      //     //       task.step === beforeTask.step &&
      //     //       task.sub_step === beforeTask.sub_step &&
      //     //       task.kind === beforeTask.kind &&
      //     //       task.command === beforeTask.command
      //     //   );
      //     //   if (!exists) {
      //     //     // Maybe the task is not found because the user added skip
      //     //     // For that reason I do a last check to verify is not the case
      //     //     const hasSkip = workspaceData.projects.some(
      //     //       (project) => project.name === beforeTask.command && project.configuration.skip
      //     //     );

      //     //     if (!hasSkip) {
      //     //       // Add destroy tasks
      //     // taskItems.push({
      //     //   step: 'DR',
      //     //   sub_step: 'DESTROY',
      //     //   depends_on: 'VA',
      //     //   kind: beforeTask.kind,
      //     //   command: beforeTask.command,
      //     // });
      //     //     }
      //     //   }
      //     // });
      //   }
      // }

      // -----------------------------------------------------------------------
      // Before start we need to create a new Key in redis to set the information
      // that we need in the next steps , additionaly also the git data
      cLogger.start();
      cLogger.log('[Pipeline] Creating tasks from commit ...');

      const tasks = taskItems.map((task) => {
        incrementalTaskId++;
        const newTask: Partial<Pipelines.TTaskNew> = {
          commit_id: pipelineHash,
          task_id: incrementalTaskId,
          state: task.step === 'VA' ? 'PENDING' : 'IDLE',
          ...task,
        };
        return Pipelines.TaskNewSchema.parse(newTask);
      });

      // -----------------------------------------------------------------------
      // The next transation set initial metatada in the commit
      // and create all the tasks to execute by the runners
      await this.postgres.transaction(async (trx) => {
        // Set initial metadata in commits table
        // to provide metadata to initial steps that run in organization cluster
        await trx
          .table(COMMIT_TABLE_NAME)
          .update({
            meta_data: JSON.stringify(initialMetadata),
          })
          .where({ id: pipelineHash });

        await trx.table<Pipelines.TTask>(COMMIT_TASKS_TABLE_NAME).insert(tasks);
      });

      /*
      const metadata: Pipelines.IMetadata = {
        subevents,
        git: {
          product,
          commit,
          commit_message: commitMessage,
          organization,
          stage: message.stage.name,
          event: message.stage.name === 'production' ? 'git.tag' : 'git.commit',
          ref: message.stage.id,
          pipeline: {
            context: pipelineContext,
            version: pipelineVersion,
          },
        },
        golden: {
          needed: false,
          data: undefined,
        },
        targets,
        cloud_components: cloudComponents.reduce<{ [key: string]: Seki.Cloud.ICloudComponentRc }>(
          (cloudComponents, cloudComponent) => {
            const key = `${cloudComponent.kind}_${cloudComponent.identifier}`;
            const { identifier, kind, version, properties, output, srcRepoUrl, creator } =
              cloudComponent;
            cloudComponents[key] = {
              identifier,
              kind,
              version,
              properties,
              output,
              srcRepoUrl,
              creator,
            };
            return cloudComponents;
          },
          {}
        ),
        secrets: workspaceData.secrets,
      };

      // Mark as we need golden if at least one target depends on GOLDEN
      if (targetWithGoldenRequires.length > 0) {
        metadata.golden = {
          needed: true,
          data: {
            kind: 'golden',
            sha1: workspaceData.hash,
            project: secrets.IMAGE_BUILDER_CLOUD_PROJECT_ID,
            registry: secrets.CLOUD_CONTAINER_REGISTRY,
            region: 'us-east1',
            image: `${secrets.CLOUD_CONTAINER_REGISTRY}/${secrets.IMAGE_BUILDER_CLOUD_PROJECT_ID}/${product}/golden:${workspaceData.hash}`,
          },
        };
      }
*/

      cLogger.stop();
      cLogger.log(`[Pipeline] tasks created ${cLogger.toString()}`);

      // -----------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // Send a final message to notify the OK status of this pipe step
      cLogger.log(`Commit to Tasks: ${colors.bold(product)} ${colors.green('[DONE]')}`);
      // ---------------------------------------------------------------------------
    } catch (error) {
      // Dont throw an exception , just console and close the message
      // in the queue
      cLogger.error('An error occurred processing github event');
      cLogger.debug({
        error: (error as Error).message,
        organization,
        product,
        commit,
      });
    } finally {
      // Remove the downloaded repository to avoid fill the ephemeral storage
      if (repoFullPath) {
        rmSync(repoFullPath, {
          recursive: true,
          force: true,
        });

        cLogger.log(`Repository folder cleanup ${colors.green('[DONE]')}`);
      }
    }
  }
}
