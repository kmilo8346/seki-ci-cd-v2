import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { ControlPlane, Pipelines } from '@seki-ci/models';
import { Roles } from '@team_seki/nestjs-jwt-module';

import { RunnersService } from './Service';

const READ_ROLE_NAME = 'control-plane:read';
const WRITE_ROLE_NAME = 'control-plane:write';

@Controller('/runners')
@Roles(WRITE_ROLE_NAME)
export class RunnersController {
  constructor(private readonly service: RunnersService) {}

  @Patch()
  registerMany(
    @Body(new Nest.Pipes.ZodValidation(ControlPlane.Runner.CreateListSchema))
    model: ControlPlane.Runner.TCreateModel[]
  ) {
    return this.service.registerMany(model);
  }

  @Get()
  @Roles(READ_ROLE_NAME)
  getAll() {
    return this.service.getAll();
  }

  @Post('/not-found')
  startNotFound(
    @Body(new Nest.Pipes.ZodValidation(Pipelines.TaskPendingWithMetadataSchema))
    model: Pipelines.TTaskPendingWithMetadata
  ) {
    setTimeout(() => {
      this.service.startNotFound(model);
    }, 0);
  }
}

export default RunnersController;
