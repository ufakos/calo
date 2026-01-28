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
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AddApprovedDomainDto,
} from './dto/assessment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AssessmentStatus } from '@prisma/client';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a new assessment' })
  create(@Body() dto: CreateAssessmentDto, @Request() req: any) {
    return this.assessmentsService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List assessments' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AssessmentStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: AssessmentStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.assessmentsService.findAll({
      organizationId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assessment by ID' })
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Update an assessment' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @Request() req: any,
  ) {
    return this.assessmentsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an assessment' })
  delete(@Param('id') id: string, @Request() req: any) {
    return this.assessmentsService.delete(id, req.user.id);
  }

  @Get(':id/approved-domains')
  @ApiOperation({ summary: 'Get approved domains for an assessment' })
  getApprovedDomains(@Param('id') id: string) {
    return this.assessmentsService.getApprovedDomains(id);
  }

  @Post(':id/approved-domains')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Add an approved domain to the assessment scope' })
  addApprovedDomain(
    @Param('id') id: string,
    @Body() dto: AddApprovedDomainDto,
    @Request() req: any,
  ) {
    return this.assessmentsService.addApprovedDomain(id, dto.domain, req.user.id);
  }

  @Delete(':id/approved-domains/:domain')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Remove an approved domain from scope' })
  removeApprovedDomain(@Param('id') id: string, @Param('domain') domain: string) {
    return this.assessmentsService.removeApprovedDomain(id, domain);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get assessment statistics' })
  getStats(@Param('id') id: string) {
    return this.assessmentsService.getStats(id);
  }
}
