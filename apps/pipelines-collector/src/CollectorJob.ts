import { Logger } from '@nestjs/common';
import { MongoClient, AnyBulkWriteOperation, BulkWriteResult } from 'mongodb';
import { NativeDriverPlugin } from '@team_seki/mongodb-plugin';
import { Knex, PostgresPlugin } from '@team_seki/postgres-plugin';
import { BaseJob } from './lib/BaseJob';
import { Pipelines } from '@seki-ci/models';
import { BSON } from 'bson';

const HISTORY_DB_NAME = 'history';
const LOG_ID = 'log';
const LOG_COLLECTION_NAME = 'log';
const PIPELINES_COLLECTION_NAME = 'pipelines';

const COMMITS_DB_NAME = 'commits';
const COMMITS_TABLE_NAME = 'commits';
const COMMIT_TASKS_TABLE_NAME = 'commit_tasks';

const MAX_TIME_COMMITS_HRS = 5;

// With this vars we control the amount of pipelines
// to process in the period of five minutes(*/10 * * * *)
const LIMIT_TO_PROCESS = 5000;
const PIPELINES_TO_FETCH = 20;

interface ILog {
  id: string;
  watermark: Date;
}

export class CollectorJob extends BaseJob {
  private readonly logger: Logger;
  private readonly mongodb: MongoClient;
  private readonly postgres: Knex;

  constructor() {
    super();
    this.logger = new Logger('Collector');
    this.mongodb = new NativeDriverPlugin().getClient({
      mongoClientOptions: {
        serverSelectionTimeoutMS: 10000,
      },
    });
    this.postgres = new PostgresPlugin({
      database: COMMITS_DB_NAME,
    }).getClient();
  }

  async start() {
    let thereAreMore = true;
    let limitArrived = false;
    let totalProcessed = 0;
    while (thereAreMore && !limitArrived) {
      // The requests are executed every
      // 1 seconds to give a breath to the database
      await this.waitFor(1);

      // Excecute request, it fetch PIPELINES_TO_FETCH
      thereAreMore = await this.saveHistory();

      totalProcessed += PIPELINES_TO_FETCH;
      if (totalProcessed >= LIMIT_TO_PROCESS) {
        limitArrived = true;
      }
    }

    // First: Save history
    // Second: If all was ok, clean commits
    // We wait the save history to be ok, to avoid lose data
    await this.cleanCommits();
  }

  private async saveHistory(): Promise<boolean> {
    let thereAreMore = true;
    const historicDb = this.mongodb.db(HISTORY_DB_NAME);

    // ---------------------------------------------
    // Get watermark
    let watermark = new Date();
    const logCollection = historicDb.collection<ILog>(LOG_COLLECTION_NAME);
    const log = await logCollection.findOne({ id: LOG_ID });

    if (!log) {
      await logCollection.insertOne({
        id: LOG_ID,
        watermark,
      });
    } else {
      watermark = log.watermark;
    }
    // ---------------------------------------------

    // ---------------------------------------------
    // Get new tasks

    // Create select array and identify difrente the commit fields
    // And exclude commit meta data becasue is a agregation
    const select = [];
    select.push(
      ...Object.keys(Pipelines.CommitSchema.shape)
        .filter((key) => key !== 'meta_data')
        .map((key) => `${COMMITS_TABLE_NAME}.${key} as ${COMMITS_TABLE_NAME}.${key}`)
    );
    select.push(
      ...Object.keys(Pipelines.TaskNewSchema.shape).map(
        (key) => `${COMMIT_TASKS_TABLE_NAME}.${key} as ${COMMIT_TASKS_TABLE_NAME}.${key}`
      )
    );

    const results = await this.postgres
      .select(select)
      .from(
        this.postgres.raw(
          `(SELECT * FROM ${COMMITS_TABLE_NAME} WHERE state = 'COMPLETED' AND updated_at >= '${watermark.toISOString()}'  ORDER BY created_at ASC LIMIT ${PIPELINES_TO_FETCH}) AS ${COMMITS_TABLE_NAME}`
        )
      )
      .join(
        COMMIT_TASKS_TABLE_NAME,
        `${COMMITS_TABLE_NAME}.id`,
        `${COMMIT_TASKS_TABLE_NAME}.commit_id`
      );

    // ---------------------------------------------

    // Convert results to pipelines
    const index: Record<string, Pipelines.TPipeline> = {};
    results.forEach((result) => {
      // Extract pipeline data and task data
      // Because the query return all with table name as prefix
      const pipelineData: Record<string, unknown> = {};
      const taskData: Record<string, unknown> = {};
      Object.keys(result).forEach((field) => {
        if (field.startsWith(`${COMMITS_TABLE_NAME}.`)) {
          const key = field.replace(`${COMMITS_TABLE_NAME}.`, '');
          pipelineData[key] = result[field];
        }
        if (field.startsWith(`${COMMIT_TASKS_TABLE_NAME}.`)) {
          const key = field.replace(`${COMMIT_TASKS_TABLE_NAME}.`, '');
          taskData[key] = result[field];
        }
      });

      const _pipeline = pipelineData as Pipelines.TPipeline;
      const _task = taskData as Pipelines.TTaskNew;

      const pipeline: Pipelines.TPipeline = index[_pipeline.id];
      if (!pipeline) {
        index[_pipeline.id] = {
          ..._pipeline,
          tasks: [_task],
        };
      } else {
        pipeline.tasks.push(_task);
      }
    });

    // ---------------------------------------------
    // Save new tasks in history db
    const pipelines = Object.values(index);
    if (pipelines.length > 0) {
      console.log('Get pipeline collection');
      const pipelinesCollection =
        historicDb.collection<Pipelines.TPipeline>(PIPELINES_COLLECTION_NAME);

      // create index if no created already
      console.log(`Create index if no created already`);
      await pipelinesCollection.createIndex({ id: 1 }, { unique: true });

      console.log(`Saving bulk`);
      // bulk create if not exists that logic is added
      // to avoid an inifinite loop when fail updating watermark
      const bulk:AnyBulkWriteOperation<Pipelines.TPipeline>[] = [];
      
      pipelines.forEach((pipeline) => {
        try {
          // V1: only pipelines with a size less than 16MiB are saved
          const bytes = BSON.serialize(pipeline);
          console.log(`Pipeline ${pipeline.id} size: ${this.formatBytesToSize(bytes.length)}`);  
          bulk.push({
            updateOne: {
              filter: { id: pipeline.id },
              update: {
                $setOnInsert: pipeline,
              },
              upsert: true,
            },
          })
        } catch (error) {
          console.error(`[Error] The pipeline ${pipeline.id} size is very large`);  
          console.error(error);
        }
      });
      let saveResult:BulkWriteResult;
      if(bulk.length) {
        console.log(`Saving ${bulk.length} new tasks in history db`);
        saveResult = await pipelinesCollection.bulkWrite(
          bulk,
          {
            ordered: true,
          }
        );
        console.log({ saveResult });
      }
      

      // ---------------------------------------------
      // Update watermark

      console.log('Updating watermark');
      let newWatermark = new Date(
        Math.max(
          ...pipelines.map((pipeline) => {
            return new Date(pipeline.updated_at).valueOf();
          })
        )
      );
      newWatermark = new Date(newWatermark.valueOf() + 1);

      await logCollection.updateOne(
        { id: LOG_ID },
        {
          $set: {
            watermark: newWatermark,
          },
        }
      );
      // ---------------------------------------------

      // this.logger.debug({
      //   saveResult,
      // });
    }
    // ---------------------------------------------

    // Condition when not there are more tasks to process
    if (pipelines.length < PIPELINES_TO_FETCH) {
      thereAreMore = false;
    }

    this.logger.log(`Save historic [${pipelines.length}] ✅`);
    return thereAreMore;
  }

  private async cleanCommits() {
    const dateInPast = new Date(new Date().getTime() - MAX_TIME_COMMITS_HRS * 60 * 60 * 1000);
    const deleteResult = await this.postgres(COMMITS_DB_NAME)
      .where('updated_at', '<', dateInPast)
      .del();

    this.logger.debug({
      deleteResult,
    });
    this.logger.log(`Clean commits ✅`);
  }

  private waitFor(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private formatBytesToSize(bytes:number) {
    if (bytes < 1024) return `${bytes} bytes`;
    else if (bytes < 1048576) return `${(bytes / 1024).toFixed(3)} KiB`;
    else if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(3)} MiB`;
    else return `${(bytes / 1073741824).toFixed(3)} GiB`;
  }
}
