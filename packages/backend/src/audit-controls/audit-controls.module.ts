import { Module } from '@nestjs/common';
import { AuditControlsController } from './audit-controls.controller';
import { AuditControlsService } from './audit-controls.service';

@Module({
  controllers: [AuditControlsController],
  providers: [AuditControlsService],
  exports: [AuditControlsService],
})
export class AuditControlsModule {}
