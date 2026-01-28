import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HostValidatorService } from '../security/host-validator.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private hostValidator: HostValidatorService,
  ) {}

  async create(dto: CreateOrganizationDto) {
    // Validate the primary domain
    const domainValidation = this.hostValidator.validateHost(dto.domain);

    try {
      return await this.prisma.organization.create({
        data: {
          name: dto.name,
          domain: domainValidation.etldPlusOne,
          notes: dto.notes,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Organization with this domain already exists');
      }
      throw err;
    }
  }

  async findAll(options?: { search?: string; limit?: number; offset?: number }) {
    const { search, limit = 50, offset = 0 } = options || {};

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { domain: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { assessments: true },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { organizations, total };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { assessments: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id); // Verify exists

    const data: any = { ...dto };
    if (dto.domain) {
      const domainValidation = this.hostValidator.validateHost(dto.domain);
      data.domain = domainValidation.etldPlusOne;
    }

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.organization.delete({ where: { id } });
  }
}
