import { Controller, Get } from '@nestjs/common';
import { Public } from '@team_seki/nestjs-jwt-module';

import { HealthService } from './health.service';

@Controller()
@Public()
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get('health')
  health() {
    return this.service.health();
  }

  @Get('ping')
  ping() {
    return this.service.ping();
  }
}

export default HealthController;
