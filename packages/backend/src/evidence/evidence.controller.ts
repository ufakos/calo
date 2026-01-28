import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, EvidenceType } from '@prisma/client';

@ApiTags('evidence')
@ApiBearerAuth()
@Controller('evidence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenceController {
  constructor(private readonly service: EvidenceService) {}

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload evidence file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        assessmentId: { type: 'string' },
        type: { type: 'string', enum: Object.values(EvidenceType) },
        title: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('assessmentId') assessmentId: string,
    @Body('type') type: EvidenceType,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ) {
    return this.service.upload({
      assessmentId,
      type,
      file: file ? {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      } : undefined,
      title,
      description,
    });
  }

  @Post('snippet')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create text/snippet evidence' })
  createSnippet(@Body() body: {
    assessmentId: string;
    type: EvidenceType;
    content: string;
    sourceUrl?: string;
    title?: string;
    description?: string;
  }) {
    return this.service.upload(body);
  }

  @Get()
  @ApiOperation({ summary: 'List evidence for an assessment' })
  findByAssessment(
    @Query('assessmentId') assessmentId: string,
    @Query('type') type?: EvidenceType,
  ) {
    return this.service.findByAssessment(assessmentId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evidence metadata' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Get evidence content/file' })
  async getContent(@Param('id') id: string, @Res() res: Response) {
    const { data, mimeType } = await this.service.getContent(id);
    res.setHeader('Content-Type', mimeType);
    res.send(data);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL' })
  getDownloadUrl(@Param('id') id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Post(':id/redact')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Trigger redaction on evidence' })
  redact(@Param('id') id: string) {
    return this.service.redactEvidence(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
