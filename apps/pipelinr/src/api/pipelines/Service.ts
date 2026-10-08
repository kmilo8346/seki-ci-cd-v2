import { Injectable, Logger } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Pipelines, Rest } from '@seki-ci/models';
import { MongoService } from '@team_seki/nestjs-mongodb-module';

const HISTORY_DB_NAME = 'history';
const PIPELINES_COLLECTION_NAME = 'pipelines';

@Injectable()
export class PipelinesService {
  private readonly logger: Logger;

  constructor(private readonly mongoService: MongoService) {
    this.logger = new Logger('Pipelines');
  }

  /**
   * Get all pipelines and filter data with rest query params
   * @param queryParams
   * @returns
   */
  async getAll(queryParams: Rest.IQueryParams): Promise<Rest.ICollection<Pipelines.TPipeline>> {
    try {
      const db = this.mongoService.useDb(HISTORY_DB_NAME);
      const pipelinesCollection = db.collection<Pipelines.TPipeline>(PIPELINES_COLLECTION_NAME);

      const filters = (queryParams.filters || {}) as Record<string, unknown>;
      const sort = queryParams.sort || {};
      if (queryParams.search) {
        filters['$or'] = [
          { commit_message: { $regex: `${queryParams.search}`, $options: 'i' } },
          { trigger_by: { $regex: `${queryParams.search}`, $options: 'i' } },
        ];
      }

      const [pipelines, total] = await Promise.all([
        pipelinesCollection
          .find(filters)
          .sort(sort)
          .skip(queryParams.offset)
          .limit(queryParams.limit)
          .toArray(),
        pipelinesCollection.countDocuments(filters),
      ]);

      return {
        items: pipelines,
        limit: queryParams.limit,
        offset: queryParams.offset,
        total,
      };
    } catch (error) {
      this.logger.debug(error);
      throw new Nest.Exceptions.GetAllPipelinesException(queryParams);
    }
  }
}

export default PipelinesService;
