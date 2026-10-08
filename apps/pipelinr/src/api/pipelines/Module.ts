import { Module } from '@nestjs/common';

import { PipelinesService } from './Service';
import { PipelinesController } from './Controller';

@Module({
  imports: [],
  controllers: [PipelinesController],
  providers: [PipelinesService],
})
export class PipelinesModule {}
