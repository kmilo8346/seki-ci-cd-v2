import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TasksService } from './Service';
import { TasksController } from './Controller';
import { RunnersModule } from '../runners/Module';

@Module({
  imports: [HttpModule.register({}), RunnersModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
