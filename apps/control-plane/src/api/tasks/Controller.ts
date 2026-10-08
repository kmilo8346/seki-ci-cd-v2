import { Body, Controller, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Pipelines } from '@seki-ci/models';
import { Roles } from '@team_seki/nestjs-jwt-module';

import { TasksService } from './Service';

const WRITE_ROLE_NAME = 'control-plane:write';

@Controller('/tasks')
@Roles(WRITE_ROLE_NAME)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Patch()
  createMany(
    @Body(new Nest.Pipes.ZodValidation(Pipelines.TaskPendingsSchema))
    model: Pipelines.TTaskPendings
  ) {
    return this.service.createMany(model);
  }

  @Put('/:commitId/:id')
  complete(
    @Param('commitId') commitId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body(new Nest.Pipes.ZodValidation(Pipelines.TaskUpdateSchema))
    model: Pipelines.TTaskUpdate
  ) {
    return this.service.complete(commitId, id, model);
  }

  @Post('/:commitId/:id/abort')
  abort(@Param('commitId') commitId: string, @Param('id', ParseIntPipe) id: number) {
    return this.service.abort(commitId, id);
  }
}

export default TasksController;
