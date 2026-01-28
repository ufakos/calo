import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ObservationsService } from './observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ObservationCategory, Severity } from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateObservationDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty({ enum: ObservationCategory }) @IsEnum(ObservationCategory) category: ObservationCategory;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() summary: string;
  @ApiPropertyOptional({ enum: Severity }) @IsOptional() @IsEnum(Severity) severity?: Severity;
  @ApiPropertyOptional() @IsOptional() @IsString() details?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() analystNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() evidenceRefs?: string[];
}

@ApiTags('observations')
@ApiBearerAuth()
@Controller('observations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObservationsController {
  constructor(private readonly service: ObservationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create an observation' })
  create(@Body() dto: CreateObservationDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List observations' })
  findByAssessment(
    @Query('assessmentId') assessmentId: string,
    @Query('category') category?: ObservationCategory,
    @Query('severity') severity?: Severity,
  ) {
    return this.service.findByAssessment(assessmentId, { category, severity });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  update(@Param('id') id: string, @Body() dto: Partial<CreateObservationDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
