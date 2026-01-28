import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HostValidatorService } from '../security/host-validator.service';
import { AssetType, AssetConfidence } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private hostValidator: HostValidatorService,
  ) {}

  async create(data: {
    assessmentId: string;
    type: AssetType;
    value: string;
    displayName?: string;
    confidence?: AssetConfidence;
    notes?: string;
    metadata?: Record<string, any>;
    discoveredBy?: string;
  }) {
    // Validate the assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: data.assessmentId },
      include: { organization: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // For domain/subdomain types, validate the host
    if (['DOMAIN', 'SUBDOMAIN', 'API_HOST'].includes(data.type)) {
      const hostValidation = this.hostValidator.validateHost(data.value);

      // For subdomains, verify it's under the primary domain
      if (data.type === 'SUBDOMAIN') {
        if (!this.hostValidator.isSubdomainOf(data.value, assessment.organization.domain)) {
          throw new BadRequestException(
            `${data.value} is not a subdomain of ${assessment.organization.domain}`,
          );
        }
      }

      data.value = hostValidation.normalizedHost;
    }

    // For URLs, validate and normalize
    if (data.type === 'URL') {
      const urlValidation = this.hostValidator.validateUrl(data.value);
      data.value = urlValidation.normalizedUrl;
    }

    return this.prisma.asset.create({
      data: {
        assessmentId: data.assessmentId,
        type: data.type,
        value: data.value,
        displayName: data.displayName || data.value,
        confidence: data.confidence || 'UNVERIFIED',
        notes: data.notes,
        metadata: data.metadata,
        discoveredBy: data.discoveredBy || 'manual',
      },
    });
  }

  async findByAssessment(assessmentId: string, options?: {
    type?: AssetType;
    approved?: boolean;
  }) {
    const where: any = { assessmentId };
    if (options?.type) where.type = options.type;
    if (options?.approved !== undefined) where.approved = options.approved;

    return this.prisma.asset.findMany({
      where,
      orderBy: [{ approved: 'desc' }, { type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assessment: {
          include: { organization: true },
        },
        toolRuns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async approve(id: string, approved: boolean, userId: string) {
    const asset = await this.findOne(id);

    // If approving, add to approved domains list
    if (approved && ['DOMAIN', 'SUBDOMAIN', 'API_HOST'].includes(asset.type)) {
      await this.prisma.approvedDomain.upsert({
        where: {
          assessmentId_domain: {
            assessmentId: asset.assessmentId,
            domain: asset.value,
          },
        },
        create: {
          assessmentId: asset.assessmentId,
          domain: asset.value,
          addedBy: userId,
        },
        update: {},
      });
    }

    // If un-approving, remove from approved domains
    if (!approved) {
      await this.prisma.approvedDomain.deleteMany({
        where: {
          assessmentId: asset.assessmentId,
          domain: asset.value,
        },
      });
    }

    return this.prisma.asset.update({
      where: { id },
      data: { approved },
    });
  }

  async update(id: string, data: {
    displayName?: string;
    confidence?: AssetConfidence;
    notes?: string;
    metadata?: Record<string, any>;
    evidenceRefs?: string[];
  }) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.asset.delete({ where: { id } });
  }

  async getApprovedTargets(assessmentId: string): Promise<string[]> {
    const assets = await this.prisma.asset.findMany({
      where: {
        assessmentId,
        approved: true,
        type: { in: ['DOMAIN', 'SUBDOMAIN', 'API_HOST'] },
      },
    });

    return assets.map((a) => a.value);
  }
}
