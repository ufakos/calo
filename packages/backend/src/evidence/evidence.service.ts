import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RedactionService } from '../security/redaction.service';
import { EvidenceType, RedactionStatus } from '@prisma/client';

@Injectable()
export class EvidenceService {
  private readonly ALLOWED_TYPES = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'text/plain', 'text/markdown', 'application/json',
    'text/html', 'application/pdf',
  ];
  private readonly MAX_SIZE_MB = 10;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private redaction: RedactionService,
  ) {}

  async upload(data: {
    assessmentId: string;
    type: EvidenceType;
    file?: { buffer: Buffer; mimetype: string; originalname: string; size: number };
    content?: string;
    sourceUrl?: string;
    title?: string;
    description?: string;
  }) {
    const { assessmentId, type, file, content, sourceUrl, title, description } = data;

    // Validate assessment exists
    const assessment = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    let storageKey: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number | undefined;
    let finalContent: string | undefined;
    let redactionStatus: RedactionStatus = RedactionStatus.NOT_REQUIRED;

    // Handle file upload
    if (file) {
      const validation = this.storage.validateUpload(
        { size: file.size, mimetype: file.mimetype },
        { maxSizeMb: this.MAX_SIZE_MB, allowedTypes: this.ALLOWED_TYPES },
      );
      if (!validation.valid) throw new BadRequestException(validation.error);

      // Upload to storage
      const result = await this.storage.uploadEvidence(assessmentId, file.buffer, {
        contentType: file.mimetype,
        filename: file.originalname,
        type: type.toLowerCase(),
      });
      storageKey = result.key;
      mimeType = file.mimetype;
      fileSize = file.size;
      redactionStatus = RedactionStatus.PENDING;
    }

    // Handle text content (auto-redact)
    if (content) {
      const { redacted, redactionCount } = this.redaction.redactText(content);
      finalContent = redacted;
      redactionStatus = redactionCount > 0 ? RedactionStatus.REDACTED : RedactionStatus.NOT_REQUIRED;
    }

    return this.prisma.evidence.create({
      data: {
        assessmentId,
        type,
        title,
        description,
        storageKey,
        mimeType,
        fileSize,
        content: finalContent,
        sourceUrl,
        redactionStatus,
        redactedAt: redactionStatus === RedactionStatus.REDACTED ? new Date() : null,
      },
    });
  }

  async findByAssessment(assessmentId: string, type?: EvidenceType) {
    const where: any = { assessmentId };
    if (type) where.type = type;

    return this.prisma.evidence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, title: true, description: true,
        mimeType: true, fileSize: true, redactionStatus: true,
        sourceUrl: true, createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id } });
    if (!evidence) throw new NotFoundException('Evidence not found');
    return evidence;
  }

  async getContent(id: string): Promise<{ data: Buffer | string; mimeType: string }> {
    const evidence = await this.findOne(id);

    if (evidence.content) {
      return { data: evidence.content, mimeType: 'text/plain' };
    }

    if (evidence.storageKey) {
      const data = await this.storage.getEvidence(evidence.storageKey);
      return { data, mimeType: evidence.mimeType || 'application/octet-stream' };
    }

    throw new BadRequestException('Evidence has no content');
  }

  async getDownloadUrl(id: string): Promise<string> {
    const evidence = await this.findOne(id);
    if (!evidence.storageKey) throw new BadRequestException('No file to download');
    return this.storage.getPresignedUrl(this.storage.BUCKETS.EVIDENCE, evidence.storageKey);
  }

  async delete(id: string) {
    const evidence = await this.findOne(id);
    if (evidence.storageKey) {
      await this.storage.delete(this.storage.BUCKETS.EVIDENCE, evidence.storageKey);
    }
    return this.prisma.evidence.delete({ where: { id } });
  }

  async redactEvidence(id: string) {
    const evidence = await this.findOne(id);
    
    if (evidence.content) {
      const { redacted } = this.redaction.redactText(evidence.content);
      return this.prisma.evidence.update({
        where: { id },
        data: {
          content: redacted,
          redactionStatus: RedactionStatus.REDACTED,
          redactedAt: new Date(),
        },
      });
    }

    // For files, mark as verified (manual redaction required for images)
    return this.prisma.evidence.update({
      where: { id },
      data: {
        redactionStatus: RedactionStatus.VERIFIED,
        redactedAt: new Date(),
      },
    });
  }
}
