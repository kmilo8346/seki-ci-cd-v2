import { Body, Controller, Post } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Operations } from '@seki-ci/models';
import { Roles } from '@team_seki/nestjs-jwt-module';

import { OperationService } from './Service';

const WRITE_ROLE_NAME = 'control-plane:write';

@Controller('/operations')
@Roles(WRITE_ROLE_NAME)
export class OperationController {
  constructor(private readonly service: OperationService) {}

  @Post()
  execute(
    @Body(new Nest.Pipes.ZodValidation(Operations.Schema))
    model: Operations.TModel
  ) {
    return this.service.execute(model);
  }
}

export default OperationController;
