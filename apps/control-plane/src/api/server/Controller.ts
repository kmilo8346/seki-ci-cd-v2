import { Controller, Get } from '@nestjs/common';
import { Roles } from '@team_seki/nestjs-jwt-module';

import { ServerService } from './Service';

const READ_ROLE_NAME = 'control-plane:read';
const WRITE_ROLE_NAME = 'control-plane:write';

@Controller('/server')
@Roles(WRITE_ROLE_NAME)
export class ServerController {
  constructor(private readonly service: ServerService) {}

  @Get('/info')
  @Roles(READ_ROLE_NAME)
  getInfo() {
    return this.service.getInfo();
  }
}

export default ServerController;
