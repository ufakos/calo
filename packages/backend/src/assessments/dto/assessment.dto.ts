import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AssessmentStatus } from '@prisma/client';

export class CreateAssessmentDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ example: 'Q1 2026 Security Assessment' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Q1 2026 Security Assessment' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Scope configuration JSON',
    example: { domains: ['calo.app'], excludedPaths: ['/admin'] },
  })
  @IsOptional()
  @IsObject()
  scopeJson?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'Testing only production environment. No staging access.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  assumptionsText?: string;

  @ApiPropertyOptional({
    example: 'No load testing. Testing window: 9am-5pm GST.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  constraintsText?: string;
}

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
  @ApiPropertyOptional({ enum: AssessmentStatus })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  completedAt?: Date;
}

export class AddApprovedDomainDto {
  @ApiProperty({ example: 'api.calo.app' })
  @IsString()
  @IsNotEmpty()
  domain: string;
}
