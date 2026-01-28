/**
 * MinIO storage client for the worker
 */

import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger';

const logger = new Logger('Storage');

export class StorageClient {
  private client: Minio.Client;
  readonly BUCKETS = {
    EVIDENCE: 'evidence',
    REPORTS: 'reports',
    TOOL_OUTPUTS: 'tool-outputs',
  };

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
  }

  /**
   * Upload tool output
   */
  async uploadToolOutput(
    assessmentId: string,
    toolRunId: string,
    data: string,
    type: 'stdout' | 'stderr'
  ): Promise<string> {
    const bucket = this.BUCKETS.TOOL_OUTPUTS;
    const key = `${assessmentId}/${toolRunId}/${type}.txt`;

    const buffer = Buffer.from(data, 'utf-8');
    await this.client.putObject(bucket, key, buffer, buffer.length, {
      'Content-Type': 'text/plain',
    });

    logger.debug(`Uploaded ${type} to ${bucket}/${key}`);
    return key;
  }

  /**
   * Get tool output
   */
  async getToolOutput(key: string): Promise<string> {
    const stream = await this.client.getObject(this.BUCKETS.TOOL_OUTPUTS, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });
  }
}
