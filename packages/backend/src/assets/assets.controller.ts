import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AssetType, AssetConfidence } from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateAssetDto {
  @ApiProperty() @IsString() assessmentId: string;
  @ApiProperty({ enum: AssetType }) @IsEnum(AssetType) type: AssetType;
  @ApiProperty() @IsString() value: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional({ enum: AssetConfidence }) @IsOptional() @IsEnum(AssetConfidence) confidence?: AssetConfidence;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsString() discoveredBy?: string;
}

class UpdateAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional({ enum: AssetConfidence }) @IsOptional() @IsEnum(AssetConfidence) confidence?: AssetConfidence;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsArray() evidenceRefs?: string[];
}

class ApproveAssetDto {
  @ApiProperty() @IsBoolean() approved: boolean;
}

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a new asset' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List assets for an assessment' })
  @ApiQuery({ name: 'assessmentId', required: true })
  @ApiQuery({ name: 'type', required: false, enum: AssetType })
  @ApiQuery({ name: 'approved', required: false, type: Boolean })
  findByAssessment(
    @Query('assessmentId') assessmentId: string,
    @Query('type') type?: AssetType,
    @Query('approved') approved?: boolean,
  ) {
    return this.assetsService.findByAssessment(assessmentId, { type, approved });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an asset by ID' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Approve or reject an asset for scanning' })
  approve(@Param('id') id: string, @Body() dto: ApproveAssetDto, @Request() req: any) {
    return this.assetsService.approve(id, dto.approved, req.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Update asset details' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Delete an asset' })
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}
