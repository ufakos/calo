import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RisksService } from './risks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, RiskImpact, RiskLikelihood } from '@prisma/client';
import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateRiskDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsNumber() @Min(1) @Max(5) rank: number;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: RiskImpact }) @IsOptional() @IsEnum(RiskImpact) impact?: RiskImpact;
  @ApiPropertyOptional({ enum: RiskLikelihood }) @IsOptional() @IsEnum(RiskLikelihood) likelihood?: RiskLikelihood;
  @ApiPropertyOptional() @IsOptional() @IsString() blastRadius?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() easeToFix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rationale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendation?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() evidenceRefs?: string[];
}

class ReorderRisksDto {
  @ApiProperty() @IsArray() @IsString({ each: true }) orderedIds: string[];
}

@ApiTags('risks')
@ApiBearerAuth()
@Controller('risks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RisksController {
  constructor(private readonly service: RisksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a risk' })
  create(@Body() dto: CreateRiskDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List risks for an assessment' })
  findByAssessment(@Query('assessmentId') assessmentId: string) {
    return this.service.findByAssessment(assessmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  update(@Param('id') id: string, @Body() dto: Partial<CreateRiskDto>) {
    return this.service.update(id, dto);
  }

  @Post('reorder')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Reorder risks by providing ordered IDs' })
  reorder(@Query('assessmentId') assessmentId: string, @Body() dto: ReorderRisksDto) {
    return this.service.reorder(assessmentId, dto.orderedIds);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
