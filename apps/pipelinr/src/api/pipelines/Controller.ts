import { Controller, Get, Query } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Rest } from '@seki-ci/models';
import { Roles } from '@team_seki/nestjs-jwt-module';
import { PipelinesService } from './Service';

const READ_ROLE_NAME = 'pipelinr:read';

@Controller('/pipelines')
@Roles(READ_ROLE_NAME)
export class PipelinesController {
  constructor(private readonly service: PipelinesService) {}

  @Get('/')
  getAll(@Query(new Nest.Pipes.QueryParams()) queryParams: Rest.IQueryParams) {
    return this.service.getAll(queryParams);
  }
}

export default PipelinesController;
