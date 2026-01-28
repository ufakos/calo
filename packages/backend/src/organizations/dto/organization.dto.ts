import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Calo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'calo.app', description: 'Primary domain (eTLD+1)' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiPropertyOptional({ example: 'Food-tech company in MENA region' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
