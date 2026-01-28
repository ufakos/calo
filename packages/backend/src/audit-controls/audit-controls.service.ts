import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditFrequency } from '@prisma/client';

@Injectable()
export class AuditControlsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    assessmentId: string;
    title: string;
    description?: string;
    evidenceGenerated?: string;
    frequency?: AuditFrequency;
    automated?: boolean;
    mappedFramework?: string[];
    implementation?: string;
    toolsUsed?: string[];
  }) {
    return this.prisma.auditControl.create({
      data: {
        ...data,
        mappedFramework: data.mappedFramework ?? [],
        toolsUsed: data.toolsUsed ?? [],
      },
    });
  }

  async findByAssessment(assessmentId: string) {
    return this.prisma.auditControl.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const control = await this.prisma.auditControl.findUnique({ where: { id } });
    if (!control) throw new NotFoundException('Audit control not found');
    return control;
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    evidenceGenerated: string;
    frequency: AuditFrequency;
    automated: boolean;
    mappedFramework: string[];
    implementation: string;
    toolsUsed: string[];
  }>) {
    await this.findOne(id);
    return this.prisma.auditControl.update({
      where: { id },
      data: {
        ...data,
        ...(data.mappedFramework ? { mappedFramework: data.mappedFramework } : {}),
        ...(data.toolsUsed ? { toolsUsed: data.toolsUsed } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.auditControl.delete({ where: { id } });
  }
}
