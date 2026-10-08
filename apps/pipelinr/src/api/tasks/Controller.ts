import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Pipelines } from '@seki-ci/models';
import { Roles, Scopes, User, UserInfo } from '@team_seki/nestjs-jwt-module';
import { TasksService } from './Service';

const READ_ROLE_NAME = 'pipelinr:read';
const WRITE_ROLE_NAME = 'pipelinr:write';

@Controller('/tasks')
@Roles(WRITE_ROLE_NAME)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Put('/:commitId/:id')
  complete(
    @Param('commitId') commitId: string,
    @Param('id') id: number,
    @Body(new Nest.Pipes.ZodValidation(Pipelines.TaskUpdateSchema))
    model: Pipelines.TTaskUpdate
  ) {
    return this.service.complete(commitId, id, model);
  }

  @Post('/:commitId/:id/abort')
  abort(@Param('commitId') commitId: string, @Param('id') id: number) {
    return this.service.abort(commitId, id);
  }

  @Patch('/')
  markAsStarted(
    @Body(new Nest.Pipes.ZodValidation(Pipelines.TaskIdsSchema))
    model: Pipelines.TTaskId[]
  ) {
    return this.service.markAsStarted(model);
  }

  @Get('/pendings')
  @Roles(READ_ROLE_NAME)
  @Scopes('organization', 'environment')
  getPendings(@User() user: UserInfo, @Query('limit') limit?: number) {
    const organization = user.getScopes().first('organization');
    const environment = user.getScopes().first('environment');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.service.getPendings(organization!, environment!, limit);
  }

  @Get('/:commitId')
  @Roles(READ_ROLE_NAME)
  getTasksByCommitId(
    @Param('commitId') commitId: string,
    @Query('withMetadata') withMetadata: boolean,
    @Query('withMarkdown') withMarkdown: boolean
  ) {
    return this.service.getTasksByCommitId(commitId, withMetadata, withMarkdown);
  }
}

export default TasksController;
