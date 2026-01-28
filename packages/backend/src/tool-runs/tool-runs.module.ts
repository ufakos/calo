import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ToolRunsController } from './tool-runs.controller';
import { ToolRunsService } from './tool-runs.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tool-execution',
    }),
  ],
  controllers: [ToolRunsController],
  providers: [ToolRunsService],
  exports: [ToolRunsService],
})
export class ToolRunsModule {}
