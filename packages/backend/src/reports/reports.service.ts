import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ReportGeneratorService } from './report-generator.service';
import { ReportFormat, ReportMode } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private generator: ReportGeneratorService,
  ) {}

  async generate(options: {
    assessmentId: string;
    format: ReportFormat;
    mode?: ReportMode;
    userId?: string;
  }) {
    const { assessmentId, format, mode = ReportMode.FULL, userId } = options;

    // Gather data
    const data = await this.generator.gatherReportData(assessmentId);

    let content: Buffer;
    let mimeType: string;

    switch (format) {
      case ReportFormat.MARKDOWN:
        const markdown = this.generator.generateMarkdown(data, mode);
        content = Buffer.from(markdown, 'utf-8');
        mimeType = 'text/markdown';
        break;

      case ReportFormat.HTML:
        const html = this.generator.generateHtml(data, mode);
        content = Buffer.from(html, 'utf-8');
        mimeType = 'text/html';
        break;

      case ReportFormat.PDF:
        // For PDF, we generate HTML and would use a PDF library
        // In production, you'd use Playwright or Puppeteer here
        const pdfHtml = this.generator.generateHtml(data, mode);
        content = Buffer.from(pdfHtml, 'utf-8'); // Placeholder - actual PDF conversion needed
        mimeType = 'text/html'; // Would be 'application/pdf' with actual PDF
        this.logger.warn('PDF generation requires additional setup - returning HTML for now');
        break;

      case ReportFormat.JSON:
        content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
        mimeType = 'application/json';
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Upload to storage
    const uploaded = await this.storage.uploadReport(
      assessmentId,
      content,
      format === ReportFormat.PDF ? 'html' : format.toLowerCase() as 'md' | 'html',
    );

    // Create report record
    const report = await this.prisma.report.create({
      data: {
        assessmentId,
        format,
        mode,
        title: `${data.organization.name} - Security Assessment Report`,
        storageKey: uploaded.key,
        fileSize: uploaded.size,
        generatedBy: userId,
        optionsJson: { mode },
      },
    });

    this.logger.log(`Generated ${format} report for assessment ${assessmentId}`);

    return {
      id: report.id,
      format,
      mode,
      fileSize: uploaded.size,
      generatedAt: report.generatedAt,
    };
  }

  async findByAssessment(assessmentId: string) {
    return this.prisma.report.findMany({
      where: { assessmentId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async getContent(id: string): Promise<{ data: Buffer; mimeType: string; filename: string }> {
    const report = await this.findOne(id);

    const mimeTypes: Record<ReportFormat, string> = {
      [ReportFormat.MARKDOWN]: 'text/markdown',
      [ReportFormat.HTML]: 'text/html',
      [ReportFormat.PDF]: 'application/pdf',
      [ReportFormat.JSON]: 'application/json',
    };

    const extensions: Record<ReportFormat, string> = {
      [ReportFormat.MARKDOWN]: 'md',
      [ReportFormat.HTML]: 'html',
      [ReportFormat.PDF]: 'pdf',
      [ReportFormat.JSON]: 'json',
    };

    const data = await this.storage.getObject(
      this.storage.BUCKETS.REPORTS,
      report.storageKey,
    );

    return {
      data,
      mimeType: mimeTypes[report.format],
      filename: `report-${report.assessmentId.slice(0, 8)}.${extensions[report.format]}`,
    };
  }

  async getDownloadUrl(id: string): Promise<string> {
    const report = await this.findOne(id);
    return this.storage.getPresignedUrl(
      this.storage.BUCKETS.REPORTS,
      report.storageKey,
    );
  }

  async delete(id: string) {
    const report = await this.findOne(id);
    await this.storage.delete(this.storage.BUCKETS.REPORTS, report.storageKey);
    return this.prisma.report.delete({ where: { id } });
  }
}
