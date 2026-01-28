import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObservationCategory, Severity } from '@prisma/client';

@Injectable()
export class ObservationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    assessmentId: string;
    category: ObservationCategory;
    title: string;
    summary: string;
    severity?: Severity;
    details?: string;
    analystNotes?: string;
    evidenceRefs?: string[];
  }) {
    return this.prisma.observation.create({
      data: {
        ...data,
        evidenceRefs: data.evidenceRefs ?? [],
      },
    });
  }

  async findByAssessment(assessmentId: string, options?: {
    category?: ObservationCategory;
    severity?: Severity;
  }) {
    const where: any = { assessmentId };
    if (options?.category) where.category = options.category;
    if (options?.severity) where.severity = options.severity;

    return this.prisma.observation.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const observation = await this.prisma.observation.findUnique({
      where: { id },
    });
    if (!observation) throw new NotFoundException('Observation not found');
    return observation;
  }

  async update(id: string, data: Partial<{
    category: ObservationCategory;
    title: string;
    summary: string;
    severity: Severity;
    details: string;
    analystNotes: string;
    evidenceRefs: string[];
  }>) {
    await this.findOne(id);
    return this.prisma.observation.update({
      where: { id },
      data: {
        ...data,
        ...(data.evidenceRefs ? { evidenceRefs: data.evidenceRefs } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.observation.delete({ where: { id } });
  }
}
