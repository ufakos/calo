import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportGeneratorService } from './report-generator.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportGeneratorService],
  exports: [ReportsService],
})
export class ReportsModule {}
