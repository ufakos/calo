import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskImpact, RiskLikelihood } from '@prisma/client';

@Injectable()
export class RisksService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    assessmentId: string;
    rank: number;
    title: string;
    description?: string;
    impact?: RiskImpact;
    likelihood?: RiskLikelihood;
    blastRadius?: string;
    easeToFix?: string;
    rationale?: string;
    recommendation?: string;
    evidenceRefs?: string[];
  }) {
    if (data.rank < 1 || data.rank > 5) {
      throw new BadRequestException('Rank must be between 1 and 5');
    }

    // Check if rank already exists
    const existing = await this.prisma.risk.findUnique({
      where: { assessmentId_rank: { assessmentId: data.assessmentId, rank: data.rank } },
    });
    if (existing) {
      throw new BadRequestException(`Risk with rank ${data.rank} already exists`);
    }

    return this.prisma.risk.create({
      data: {
        ...data,
        evidenceRefs: data.evidenceRefs ?? [],
      },
    });
  }

  async findByAssessment(assessmentId: string) {
    return this.prisma.risk.findMany({
      where: { assessmentId },
      orderBy: { rank: 'asc' },
    });
  }

  async findOne(id: string) {
    const risk = await this.prisma.risk.findUnique({ where: { id } });
    if (!risk) throw new NotFoundException('Risk not found');
    return risk;
  }

  async update(id: string, data: Partial<{
    rank: number;
    title: string;
    description: string;
    impact: RiskImpact;
    likelihood: RiskLikelihood;
    blastRadius: string;
    easeToFix: string;
    rationale: string;
    recommendation: string;
    evidenceRefs: string[];
  }>) {
    const risk = await this.findOne(id);

    if (data.rank && data.rank !== risk.rank) {
      const existing = await this.prisma.risk.findUnique({
        where: { assessmentId_rank: { assessmentId: risk.assessmentId, rank: data.rank } },
      });
      if (existing) {
        throw new BadRequestException(`Risk with rank ${data.rank} already exists`);
      }
    }

    return this.prisma.risk.update({
      where: { id },
      data: {
        ...data,
        ...(data.evidenceRefs ? { evidenceRefs: data.evidenceRefs } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.risk.delete({ where: { id } });
  }

  async reorder(assessmentId: string, orderedIds: string[]) {
    const risks = await this.findByAssessment(assessmentId);
    if (orderedIds.length !== risks.length) {
      throw new BadRequestException('Must provide all risk IDs');
    }

    const updates = orderedIds.map((id, index) =>
      this.prisma.risk.update({
        where: { id },
        data: { rank: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.findByAssessment(assessmentId);
  }
}
