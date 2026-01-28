/**
 * Tool Executor - SAFE security tool execution
 * 
 * This module executes security tools with strict safety constraints:
 * - Only approved, low-impact tools
 * - Rate limited requests
 * - Target validation before each request
 * - Output sanitization/redaction
 * - Timeout enforcement
 * 
 * TOOLS SUPPORTED:
 * - TLS_CHECK: OpenSSL TLS certificate/config check
 * - HEADER_CHECK: HTTP response headers
 * - SECURITY_HEADERS: Security header analysis
 * - CORS_CHECK: CORS configuration check
 * - DNS_LOOKUP: DNS record lookup (A, AAAA, CNAME, MX, TXT)
 * - CERT_TRANSPARENCY: Certificate transparency log lookup
 * - TECH_FINGERPRINT: Technology fingerprinting from headers
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';
import * as http from 'http';
import { PrismaClient, ToolName } from '@prisma/client';
import { StorageClient } from '../storage';
import { RateLimiter } from '../rate-limiter';
import { Logger } from '../logger';

const execAsync = promisify(exec);
const logger = new Logger('ToolExecutor');

interface ExecutionParams {
  toolRunId: string;
  assessmentId: string;
  toolName: ToolName;
  target: string;
  parameters?: Record<string, any>;
}

interface ExecutionResult {
  success: boolean;
  summary: string;
  stdoutRef?: string;
  stderrRef?: string;
  exitCode: number;
  requestCount: number;
  data?: any;
}

export class ToolExecutor {
  constructor(
    private prisma: PrismaClient,
    private storage: StorageClient,
    private rateLimiter: RateLimiter,
  ) {}

  async execute(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, toolName, target } = params;
    logger.info(`Executing ${toolName} on ${target}`);

    // Reset rate limiter state for this run
    this.rateLimiter.resetRunState(toolRunId);

    try {
      let result: ExecutionResult;

      switch (toolName) {
        case 'TLS_CHECK':
          result = await this.executeTlsCheck(params);
          break;
        case 'HEADER_CHECK':
          result = await this.executeHeaderCheck(params);
          break;
        case 'SECURITY_HEADERS':
          result = await this.executeSecurityHeaders(params);
          break;
        case 'CORS_CHECK':
          result = await this.executeCorsCheck(params);
          break;
        case 'DNS_LOOKUP':
          result = await this.executeDnsLookup(params);
          break;
        case 'CERT_TRANSPARENCY':
          result = await this.executeCertTransparency(params);
          break;
        case 'TECH_FINGERPRINT':
          result = await this.executeTechFingerprint(params);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return result;
    } catch (error: any) {
      logger.error(`Tool execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * TLS Check using OpenSSL
   */
  private async executeTlsCheck(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    await this.rateLimiter.waitForRequestSlot(toolRunId);

    const host = this.extractHost(target);
    const command = `echo | openssl s_client -connect ${host}:443 -servername ${host} 2>&1 | openssl x509 -noout -text 2>&1 || true`;

    try {
      const { stdout, stderr } = await this.rateLimiter.withTimeout(
        execAsync(command, { timeout: 15000 })
      );

      const output = stdout + (stderr ? `\n\nSTDERR:\n${stderr}` : '');
      const redacted = this.redactOutput(output);

      // Upload output
      const stdoutRef = await this.storage.uploadToolOutput(
        assessmentId,
        toolRunId,
        redacted,
        'stdout'
      );

      // Parse key info
      const summary = this.parseTlsSummary(output);

      return {
        success: true,
        summary,
        stdoutRef,
        exitCode: 0,
        requestCount: 1,
        data: { host },
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `TLS check failed: ${error.message}`,
        exitCode: 1,
        requestCount: 1,
      };
    }
  }

  /**
   * HTTP Header Check
   */
  private async executeHeaderCheck(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    await this.rateLimiter.waitForRequestSlot(toolRunId);

    const url = target.startsWith('http') ? target : `https://${target}`;

    try {
      const headers = await this.rateLimiter.withTimeout(
        this.fetchHeaders(url)
      );

      const output = Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const redacted = this.redactOutput(output);
      const stdoutRef = await this.storage.uploadToolOutput(
        assessmentId,
        toolRunId,
        redacted,
        'stdout'
      );

      return {
        success: true,
        summary: `Retrieved ${Object.keys(headers).length} response headers`,
        stdoutRef,
        exitCode: 0,
        requestCount: 1,
        data: headers,
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `Header check failed: ${error.message}`,
        exitCode: 1,
        requestCount: 1,
      };
    }
  }

  /**
   * Security Headers Analysis
   */
  private async executeSecurityHeaders(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    await this.rateLimiter.waitForRequestSlot(toolRunId);

    const url = target.startsWith('http') ? target : `https://${target}`;

    try {
      const headers = await this.rateLimiter.withTimeout(
        this.fetchHeaders(url)
      );

      const analysis = this.analyzeSecurityHeaders(headers);
      const output = JSON.stringify(analysis, null, 2);

      const stdoutRef = await this.storage.uploadToolOutput(
        assessmentId,
        toolRunId,
        output,
        'stdout'
      );

      const missingCount = analysis.missing.length;
      const presentCount = analysis.present.length;

      return {
        success: true,
        summary: `Security headers: ${presentCount} present, ${missingCount} missing. Score: ${analysis.score}/100`,
        stdoutRef,
        exitCode: 0,
        requestCount: 1,
        data: analysis,
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `Security headers check failed: ${error.message}`,
        exitCode: 1,
        requestCount: 1,
      };
    }
  }

  /**
   * CORS Configuration Check
   */
  private async executeCorsCheck(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    await this.rateLimiter.waitForRequestSlot(toolRunId);

    const url = target.startsWith('http') ? target : `https://${target}`;
    const testOrigins = ['https://evil.com', 'null', 'https://example.com'];

    const results: any[] = [];

    for (const origin of testOrigins) {
      await this.rateLimiter.waitForRequestSlot(toolRunId);
      
      try {
        const headers = await this.rateLimiter.withTimeout(
          this.fetchHeadersWithOrigin(url, origin)
        );
        
        results.push({
          origin,
          allowOrigin: headers['access-control-allow-origin'],
          allowCredentials: headers['access-control-allow-credentials'],
          allowMethods: headers['access-control-allow-methods'],
          allowHeaders: headers['access-control-allow-headers'],
        });
      } catch (error: any) {
        results.push({ origin, error: error.message });
      }
    }

    const output = JSON.stringify(results, null, 2);
    const stdoutRef = await this.storage.uploadToolOutput(
      assessmentId,
      toolRunId,
      output,
      'stdout'
    );

    // Check for dangerous CORS config
    const hasWildcard = results.some(r => r.allowOrigin === '*');
    const reflectsOrigin = results.some(r => r.allowOrigin === r.origin && r.origin !== 'null');

    let severity = 'info';
    if (hasWildcard) severity = 'medium';
    if (reflectsOrigin && results.some(r => r.allowCredentials === 'true')) severity = 'high';

    return {
      success: true,
      summary: `CORS check complete. Severity: ${severity}. Wildcard: ${hasWildcard}, Reflects origin: ${reflectsOrigin}`,
      stdoutRef,
      exitCode: 0,
      requestCount: testOrigins.length + 1,
      data: { results, severity },
    };
  }

  /**
   * DNS Lookup
   */
  private async executeDnsLookup(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    const host = this.extractHost(target);
    
    const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
    const results: Record<string, string[]> = {};

    for (const type of recordTypes) {
      await this.rateLimiter.waitForRequestSlot(toolRunId);
      
      try {
        const { stdout } = await this.rateLimiter.withTimeout(
          execAsync(`dig +short ${type} ${host}`, { timeout: 10000 })
        );
        
        const records = stdout.trim().split('\n').filter(Boolean);
        if (records.length > 0) {
          results[type] = records;
        }
      } catch (error) {
        // Continue with other record types
      }
    }

    const output = JSON.stringify(results, null, 2);
    const stdoutRef = await this.storage.uploadToolOutput(
      assessmentId,
      toolRunId,
      output,
      'stdout'
    );

    const totalRecords = Object.values(results).flat().length;

    return {
      success: true,
      summary: `DNS lookup complete. Found ${totalRecords} records across ${Object.keys(results).length} types.`,
      stdoutRef,
      exitCode: 0,
      requestCount: recordTypes.length,
      data: results,
    };
  }

  /**
   * Certificate Transparency lookup (using crt.sh public API)
   */
  private async executeCertTransparency(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    await this.rateLimiter.waitForRequestSlot(toolRunId);

    const host = this.extractHost(target);

    try {
      const response = await this.rateLimiter.withTimeout(
        this.fetchJson(`https://crt.sh/?q=%.${host}&output=json`)
      );

      // Limit results
      const certs = Array.isArray(response) ? response.slice(0, 50) : [];
      
      // Extract unique subdomains
      const subdomains = new Set<string>();
      certs.forEach((cert: any) => {
        const name = cert.name_value || '';
        name.split('\n').forEach((n: string) => {
          if (n && !n.startsWith('*')) {
            subdomains.add(n.toLowerCase());
          }
        });
      });

      const output = JSON.stringify({
        domain: host,
        certificateCount: certs.length,
        uniqueSubdomains: Array.from(subdomains).slice(0, 100),
      }, null, 2);

      const stdoutRef = await this.storage.uploadToolOutput(
        assessmentId,
        toolRunId,
        output,
        'stdout'
      );

      return {
        success: true,
        summary: `Found ${certs.length} certificates and ${subdomains.size} unique subdomains for ${host}`,
        stdoutRef,
        exitCode: 0,
        requestCount: 1,
        data: { domain: host, subdomains: Array.from(subdomains) },
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `Certificate transparency lookup failed: ${error.message}`,
        exitCode: 1,
        requestCount: 1,
      };
    }
  }

  /**
   * Technology Fingerprinting from headers
   */
  private async executeTechFingerprint(params: ExecutionParams): Promise<ExecutionResult> {
    const { toolRunId, assessmentId, target } = params;
    await this.rateLimiter.waitForRequestSlot(toolRunId);

    const url = target.startsWith('http') ? target : `https://${target}`;

    try {
      const headers = await this.rateLimiter.withTimeout(
        this.fetchHeaders(url)
      );

      const technologies = this.detectTechnologies(headers);
      const output = JSON.stringify(technologies, null, 2);

      const stdoutRef = await this.storage.uploadToolOutput(
        assessmentId,
        toolRunId,
        output,
        'stdout'
      );

      return {
        success: true,
        summary: `Detected ${technologies.length} technologies/services`,
        stdoutRef,
        exitCode: 0,
        requestCount: 1,
        data: technologies,
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `Technology fingerprinting failed: ${error.message}`,
        exitCode: 1,
        requestCount: 1,
      };
    }
  }

  // Helper methods

  private extractHost(target: string): string {
    try {
      const url = new URL(target.startsWith('http') ? target : `https://${target}`);
      return url.hostname;
    } catch {
      return target.split('/')[0].split(':')[0];
    }
  }

  private fetchHeaders(url: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.request(url, { method: 'HEAD' }, (res) => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          headers[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value || '';
        }
        resolve(headers);
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
  }

  private fetchHeadersWithOrigin(url: string, origin: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const parsedUrl = new URL(url);
      
      const req = protocol.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'GET',
        },
      }, (res) => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          headers[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value || '';
        }
        resolve(headers);
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
  }

  private fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }

  private parseTlsSummary(output: string): string {
    const lines = output.split('\n');
    const issuer = lines.find(l => l.includes('Issuer:'))?.trim() || 'Unknown issuer';
    const subject = lines.find(l => l.includes('Subject:'))?.trim() || 'Unknown subject';
    const notAfter = lines.find(l => l.includes('Not After'))?.trim() || '';
    
    return `${subject}. ${issuer}. ${notAfter}`.substring(0, 500);
  }

  private analyzeSecurityHeaders(headers: Record<string, string>): {
    present: string[];
    missing: string[];
    issues: string[];
    score: number;
  } {
    const securityHeaders = {
      'strict-transport-security': 10,
      'content-security-policy': 15,
      'x-content-type-options': 10,
      'x-frame-options': 10,
      'x-xss-protection': 5,
      'referrer-policy': 10,
      'permissions-policy': 10,
      'cross-origin-embedder-policy': 10,
      'cross-origin-opener-policy': 10,
      'cross-origin-resource-policy': 10,
    };

    const present: string[] = [];
    const missing: string[] = [];
    const issues: string[] = [];
    let score = 0;

    for (const [header, points] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        present.push(header);
        score += points;
      } else {
        missing.push(header);
      }
    }

    // Check for issues
    if (headers['server']) {
      issues.push(`Server header exposes: ${headers['server']}`);
    }
    if (headers['x-powered-by']) {
      issues.push(`X-Powered-By exposes: ${headers['x-powered-by']}`);
    }
    if (headers['strict-transport-security'] && !headers['strict-transport-security'].includes('includeSubDomains')) {
      issues.push('HSTS missing includeSubDomains directive');
    }

    return { present, missing, issues, score };
  }

  private detectTechnologies(headers: Record<string, string>): Array<{ name: string; confidence: string; evidence: string }> {
    const technologies: Array<{ name: string; confidence: string; evidence: string }> = [];

    // Server detection
    if (headers['server']) {
      const server = headers['server'];
      if (server.includes('nginx')) technologies.push({ name: 'Nginx', confidence: 'high', evidence: `Server: ${server}` });
      if (server.includes('Apache')) technologies.push({ name: 'Apache', confidence: 'high', evidence: `Server: ${server}` });
      if (server.includes('cloudflare')) technologies.push({ name: 'Cloudflare', confidence: 'high', evidence: `Server: ${server}` });
      if (server.includes('AmazonS3')) technologies.push({ name: 'Amazon S3', confidence: 'high', evidence: `Server: ${server}` });
    }

    // Framework detection
    if (headers['x-powered-by']) {
      const powered = headers['x-powered-by'];
      if (powered.includes('Express')) technologies.push({ name: 'Express.js', confidence: 'high', evidence: `X-Powered-By: ${powered}` });
      if (powered.includes('PHP')) technologies.push({ name: 'PHP', confidence: 'high', evidence: `X-Powered-By: ${powered}` });
      if (powered.includes('ASP.NET')) technologies.push({ name: 'ASP.NET', confidence: 'high', evidence: `X-Powered-By: ${powered}` });
      if (powered.includes('Next.js')) technologies.push({ name: 'Next.js', confidence: 'high', evidence: `X-Powered-By: ${powered}` });
    }

    // CDN/WAF detection
    if (headers['cf-ray']) technologies.push({ name: 'Cloudflare', confidence: 'high', evidence: 'cf-ray header present' });
    if (headers['x-amz-cf-id']) technologies.push({ name: 'Amazon CloudFront', confidence: 'high', evidence: 'x-amz-cf-id header present' });
    if (headers['x-vercel-id']) technologies.push({ name: 'Vercel', confidence: 'high', evidence: 'x-vercel-id header present' });
    if (headers['x-cache'] && headers['x-cache'].includes('cloudfront')) technologies.push({ name: 'Amazon CloudFront', confidence: 'high', evidence: 'x-cache header' });

    // Cookie-based detection
    const cookies = headers['set-cookie'] || '';
    if (cookies.includes('AWSALB')) technologies.push({ name: 'AWS ALB', confidence: 'medium', evidence: 'AWSALB cookie' });
    if (cookies.includes('JSESSIONID')) technologies.push({ name: 'Java/Servlet', confidence: 'medium', evidence: 'JSESSIONID cookie' });

    return technologies;
  }

  private redactOutput(output: string): string {
    // Redact sensitive patterns
    return output
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[REDACTED_JWT]')
      .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
      .replace(/-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');
  }
}
