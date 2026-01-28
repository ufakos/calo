import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActionsService } from './actions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ActionPhase, ActionOwner, ActionPriority } from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateActionDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty({ enum: ActionPhase }) @IsEnum(ActionPhase) phase: ActionPhase;
  @ApiProperty({ enum: ActionOwner }) @IsEnum(ActionOwner) ownerType: ActionOwner;
  @ApiPropertyOptional({ enum: ActionPriority }) @IsOptional() @IsEnum(ActionPriority) priority?: ActionPriority;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() successMetric?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
}

@ApiTags('actions')
@ApiBearerAuth()
@Controller('action-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActionsController {
  constructor(private readonly service: ActionsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create an action item' })
  create(@Body() dto: CreateActionDto) {
    return this.service.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List action items' })
  findByAssessment(
    @Query('assessmentId') assessmentId: string,
    @Query('phase') phase?: ActionPhase,
  ) {
    return this.service.findByAssessment(assessmentId, phase);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  update(@Param('id') id: string, @Body() dto: Partial<CreateActionDto & { completed: boolean; notes: string }>) {
    return this.service.update(id, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Mark action as complete/incomplete' })
  markComplete(@Param('id') id: string, @Body() body: { completed: boolean }) {
    return this.service.markComplete(id, body.completed);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
