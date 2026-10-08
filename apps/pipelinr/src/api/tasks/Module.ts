import { Module } from '@nestjs/common';

import { TasksService } from './Service';
import { TasksController } from './Controller';

@Module({
  imports: [],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
