import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;

  // Bucket names
  readonly BUCKETS = {
    EVIDENCE: 'evidence',
    REPORTS: 'reports',
    TOOL_OUTPUTS: 'tool-outputs',
  };

  constructor(private configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get<string>('MINIO_PORT', '9000')),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin123'),
    });
  }

  async onModuleInit() {
    // Ensure buckets exist
    for (const bucket of Object.values(this.BUCKETS)) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket);
          this.logger.log(`Created bucket: ${bucket}`);
        }
      } catch (error) {
        this.logger.error(`Failed to check/create bucket ${bucket}:`, error);
      }
    }
  }

  /**
   * Upload a file to storage
   */
  async upload(
    bucket: string,
    data: Buffer | string,
    options: {
      contentType?: string;
      prefix?: string;
      filename?: string;
    } = {},
  ): Promise<UploadResult> {
    const { contentType = 'application/octet-stream', prefix = '', filename } = options;
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const key = `${prefix}${filename || uuidv4()}`;

    await this.client.putObject(bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    this.logger.debug(`Uploaded ${key} to ${bucket} (${buffer.length} bytes)`);

    return {
      key,
      bucket,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Upload evidence file
   */
  async uploadEvidence(
    assessmentId: string,
    data: Buffer | string,
    options: {
      contentType?: string;
      filename?: string;
      type?: string;
    } = {},
  ): Promise<UploadResult> {
    const prefix = `${assessmentId}/${options.type || 'general'}/`;
    const extension = this.getExtension(options.contentType || 'application/octet-stream');
    const filename = options.filename || `${uuidv4()}${extension}`;

    return this.upload(this.BUCKETS.EVIDENCE, data, {
      ...options,
      prefix,
      filename,
    });
  }

  /**
   * Upload tool output
   */
  async uploadToolOutput(
    assessmentId: string,
    toolRunId: string,
    data: string,
    type: 'stdout' | 'stderr',
  ): Promise<UploadResult> {
    const prefix = `${assessmentId}/${toolRunId}/`;
    const filename = `${type}.txt`;

    return this.upload(this.BUCKETS.TOOL_OUTPUTS, data, {
      contentType: 'text/plain',
      prefix,
      filename,
    });
  }

  /**
   * Upload generated report
   */
  async uploadReport(
    assessmentId: string,
    data: Buffer,
    format: 'pdf' | 'md' | 'html',
  ): Promise<UploadResult> {
    const contentTypes = {
      pdf: 'application/pdf',
      md: 'text/markdown',
      html: 'text/html',
    };

    const prefix = `${assessmentId}/`;
    const filename = `report-${Date.now()}.${format}`;

    return this.upload(this.BUCKETS.REPORTS, data, {
      contentType: contentTypes[format],
      prefix,
      filename,
    });
  }

  /**
   * Get a file from storage
   */
  async getObject(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Get evidence file
   */
  async getEvidence(key: string): Promise<Buffer> {
    return this.getObject(this.BUCKETS.EVIDENCE, key);
  }

  /**
   * Get presigned URL for downloading
   */
  async getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expirySeconds);
  }

  /**
   * Delete a file
   */
  async delete(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
    this.logger.debug(`Deleted ${key} from ${bucket}`);
  }

  /**
   * List objects in a bucket with prefix
   */
  async listObjects(
    bucket: string,
    prefix: string,
  ): Promise<{ key: string; size: number; lastModified: Date }[]> {
    return new Promise((resolve, reject) => {
      const objects: { key: string; size: number; lastModified: Date }[] = [];
      const stream = this.client.listObjects(bucket, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name && obj.lastModified) {
          objects.push({
            key: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      });
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }

  /**
   * Get file extension from content type
   */
  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'text/html': '.html',
      'application/json': '.json',
    };
    return map[contentType] || '';
  }

  /**
   * Validate file upload (size and type restrictions)
   */
  validateUpload(
    file: { size: number; mimetype: string },
    options: {
      maxSizeMb?: number;
      allowedTypes?: string[];
    } = {},
  ): { valid: boolean; error?: string } {
    const { maxSizeMb = 10, allowedTypes } = options;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    // Check size
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${maxSizeMb}MB`,
      };
    }

    // Check type
    if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }
}
