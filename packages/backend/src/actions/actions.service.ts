import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActionPhase, ActionOwner, ActionPriority } from '@prisma/client';

@Injectable()
export class ActionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    assessmentId: string;
    phase: ActionPhase;
    ownerType: ActionOwner;
    priority?: ActionPriority;
    title: string;
    description?: string;
    successMetric?: string;
    dueDate?: Date;
  }) {
    return this.prisma.actionItem.create({ data });
  }

  async findByAssessment(assessmentId: string, phase?: ActionPhase) {
    const where: any = { assessmentId };
    if (phase) where.phase = phase;

    return this.prisma.actionItem.findMany({
      where,
      orderBy: [{ phase: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.actionItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Action item not found');
    return item;
  }

  async update(id: string, data: Partial<{
    phase: ActionPhase;
    ownerType: ActionOwner;
    priority: ActionPriority;
    title: string;
    description: string;
    successMetric: string;
    dueDate: Date;
    completed: boolean;
    notes: string;
  }>) {
    await this.findOne(id);
    return this.prisma.actionItem.update({
      where: { id },
      data: {
        ...data,
        completedAt: data.completed ? new Date() : null,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.actionItem.delete({ where: { id } });
  }

  async markComplete(id: string, completed: boolean) {
    await this.findOne(id);
    return this.prisma.actionItem.update({
      where: { id },
      data: { completed, completedAt: completed ? new Date() : null },
    });
  }
}
