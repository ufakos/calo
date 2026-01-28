import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditControlsService } from './audit-controls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AuditFrequency } from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateAuditControlDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() evidenceGenerated?: string;
  @ApiPropertyOptional({ enum: AuditFrequency }) @IsOptional() @IsEnum(AuditFrequency) frequency?: AuditFrequency;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() automated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() mappedFramework?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() implementation?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() toolsUsed?: string[];
}

@ApiTags('audit-controls')
@ApiBearerAuth()
@Controller('audit-controls')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditControlsController {
  constructor(private readonly service: AuditControlsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create an audit control' })
  create(@Body() dto: CreateAuditControlDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List audit controls' })
  findByAssessment(@Query('assessmentId') assessmentId: string) {
    return this.service.findByAssessment(assessmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  update(@Param('id') id: string, @Body() dto: Partial<CreateAuditControlDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
