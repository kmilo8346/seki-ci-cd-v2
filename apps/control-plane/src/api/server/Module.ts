import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ServerService } from './Service';
import { ServerController } from './Controller';
import { TasksModule } from '../tasks/Module';

@Module({
  imports: [TasksModule, HttpModule.register({}), ServerModule],
  controllers: [ServerController],
  providers: [ServerService],
})
export class ServerModule {}
