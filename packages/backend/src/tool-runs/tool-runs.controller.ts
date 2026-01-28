import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ToolRunsService, ToolRunRequest } from './tool-runs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ToolName, ToolRunStatus } from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class EnqueueToolRunDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty({ enum: ToolName }) @IsEnum(ToolName) toolName: ToolName;
  @ApiProperty({ description: 'Target domain or URL (must be in approved scope)' })
  @IsString() target: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() parameters?: Record<string, any>;
  @ApiPropertyOptional({ description: 'If true, returns preview without executing' })
  @IsOptional() @IsBoolean() dryRun?: boolean;
}

@ApiTags('tool-runs')
@ApiBearerAuth()
@Controller('tool-runs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ToolRunsController {
  constructor(private readonly service: ToolRunsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({
    summary: 'Enqueue a tool for execution',
    description: `
      Safely execute security tools against approved targets.
      
      SAFETY CONSTRAINTS:
      - Target must be within the assessment's approved domain scope
      - Rate limited to 1 request/second
      - Maximum 50 requests per tool run
      - Maximum 2 concurrent tool executions
      
      Use dryRun: true to preview without executing.
    `,
  })
  enqueue(@Body() dto: EnqueueToolRunDto, @Request() req: any) {
    return this.service.enqueue(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List tool runs for an assessment' })
  findByAssessment(
    @Query('assessmentId') assessmentId: string,
    @Query('toolName') toolName?: ToolName,
    @Query('status') status?: ToolRunStatus,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByAssessment(assessmentId, {
      toolName,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tool run statistics' })
  getStats(@Query('assessmentId') assessmentId: string) {
    return this.service.getStats(assessmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tool run by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Cancel a queued or running tool' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
