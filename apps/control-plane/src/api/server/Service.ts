import { Injectable, Logger } from '@nestjs/common';
import TasksService from '../tasks/Service';
import secrets from '../../config/secrets';

interface IServerInfo {
  runners: {
    capacity: number;
    running: number;
    running_percent: number;
  };
}

@Injectable()
export class ServerService {
  private readonly logger: Logger;

  constructor(private readonly tasksService: TasksService) {
    this.logger = new Logger('ServerService');
  }

  async getInfo(): Promise<IServerInfo> {
    const runningIds = await this.tasksService.getRunningIds();
    const running = runningIds.length;
    return {
      runners: {
        capacity: secrets.CONTROL_PLANE_TASKS_CAPACITY,
        running: running,
        running_percent: (running * 100) / secrets.CONTROL_PLANE_TASKS_CAPACITY,
      },
    };
  }
}

export default ServerService;
