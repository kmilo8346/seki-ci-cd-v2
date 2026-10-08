import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OperationService } from './Service';
import { OperationController } from './Controller';
import { RunnersModule } from '../runners/Module';

@Module({
  imports: [HttpModule.register({}), RunnersModule],
  controllers: [OperationController],
  providers: [OperationService],
  exports: [OperationService],
})
export class OperationsModule {}
