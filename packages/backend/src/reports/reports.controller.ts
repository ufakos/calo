import { Controller, Get, Post, Delete, Body, Param, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ReportFormat, ReportMode } from '@prisma/client';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GenerateReportDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty({ enum: ReportFormat }) @IsEnum(ReportFormat) format: ReportFormat;
  @ApiPropertyOptional({ enum: ReportMode }) @IsOptional() @IsEnum(ReportMode) mode?: ReportMode;
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Generate a report' })
  generate(@Body() dto: GenerateReportDto, @Request() req: any) {
    return this.service.generate({ ...dto, userId: req.user.id });
  }

  @Get()
  @ApiOperation({ summary: 'List reports for an assessment' })
  findByAssessment(@Query('assessmentId') assessmentId: string) {
    return this.service.findByAssessment(assessmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report metadata' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download report content' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { data, mimeType, filename } = await this.service.getContent(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get presigned download URL' })
  getDownloadUrl(@Param('id') id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
