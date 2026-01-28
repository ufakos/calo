import { Injectable } from '@nestjs/common';

/**
 * RedactionService - Automatically redacts sensitive data from evidence
 * 
 * Supports redaction of:
 * - Email addresses
 * - JWT tokens
 * - API keys (common patterns)
 * - Session/cookie values
 * - Bearer tokens
 * - AWS keys
 * - Private keys
 */
@Injectable()
export class RedactionService {
  // Redaction patterns with named groups for contextual replacement
  private readonly REDACTION_PATTERNS: {
    name: string;
    pattern: RegExp;
    replacement: string;
  }[] = [
    // Email addresses
    {
      name: 'email',
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      replacement: '[REDACTED_EMAIL]',
    },
    // JWT tokens (three base64 parts separated by dots)
    {
      name: 'jwt',
      pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
      replacement: '[REDACTED_JWT]',
    },
    // Bearer tokens in headers
    {
      name: 'bearer',
      pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/gi,
      replacement: 'Bearer [REDACTED_TOKEN]',
    },
    // Authorization header values
    {
      name: 'auth_header',
      pattern: /(Authorization:\s*)(Basic\s+)?[a-zA-Z0-9+/=_-]{20,}/gi,
      replacement: '$1[REDACTED_AUTH]',
    },
    // Cookie values (session IDs, etc.)
    {
      name: 'cookie',
      pattern: /(Cookie:\s*[^;\n]*=)[a-zA-Z0-9+/=_-]{16,}/gi,
      replacement: '$1[REDACTED_COOKIE]',
    },
    // Set-Cookie values
    {
      name: 'set_cookie',
      pattern: /(Set-Cookie:\s*[^=]+=)[a-zA-Z0-9+/=_%-]{16,}/gi,
      replacement: '$1[REDACTED_COOKIE]',
    },
    // Session IDs
    {
      name: 'session',
      pattern: /(session[_-]?id[=:]?\s*)[a-zA-Z0-9+/=_-]{16,}/gi,
      replacement: '$1[REDACTED_SESSION]',
    },
    // AWS Access Keys
    {
      name: 'aws_access_key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      replacement: '[REDACTED_AWS_KEY]',
    },
    // AWS Secret Keys (40 char base64-like)
    {
      name: 'aws_secret',
      pattern: /(?<=[^a-zA-Z0-9+/=]|^)[a-zA-Z0-9+/]{40}(?=[^a-zA-Z0-9+/=]|$)/g,
      replacement: '[REDACTED_AWS_SECRET]',
    },
    // Generic API keys (common patterns)
    {
      name: 'api_key',
      pattern: /(api[_-]?key[=:]\s*)[a-zA-Z0-9_-]{20,}/gi,
      replacement: '$1[REDACTED_API_KEY]',
    },
    // X-API-Key headers
    {
      name: 'x_api_key',
      pattern: /(X-API-Key:\s*)[a-zA-Z0-9_-]{16,}/gi,
      replacement: '$1[REDACTED_API_KEY]',
    },
    // Private key blocks
    {
      name: 'private_key',
      pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE KEY-----/g,
      replacement: '[REDACTED_PRIVATE_KEY]',
    },
    // Password fields in JSON
    {
      name: 'password_json',
      pattern: /("password"\s*:\s*")[^"]+(")/gi,
      replacement: '$1[REDACTED_PASSWORD]$2',
    },
    // Password in URL
    {
      name: 'password_url',
      pattern: /(:\/\/[^:]+:)[^@]+(@)/g,
      replacement: '$1[REDACTED]$2',
    },
    // GitHub tokens
    {
      name: 'github_token',
      pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/g,
      replacement: '[REDACTED_GITHUB_TOKEN]',
    },
    // Slack tokens
    {
      name: 'slack_token',
      pattern: /xox[baprs]-[a-zA-Z0-9-]+/g,
      replacement: '[REDACTED_SLACK_TOKEN]',
    },
    // Stripe keys
    {
      name: 'stripe_key',
      pattern: /(sk|pk)_(live|test)_[a-zA-Z0-9]{24,}/g,
      replacement: '[REDACTED_STRIPE_KEY]',
    },
    // Generic long hex strings (potential secrets)
    {
      name: 'hex_secret',
      pattern: /(?<=[^a-fA-F0-9]|^)[a-fA-F0-9]{32,}(?=[^a-fA-F0-9]|$)/g,
      replacement: '[REDACTED_HEX]',
    },
    // Phone numbers (basic international format)
    {
      name: 'phone',
      pattern: /\+?[1-9]\d{1,14}(?=\s|$|[^\d])/g,
      replacement: '[REDACTED_PHONE]',
    },
  ];

  /**
   * Redact sensitive information from text content
   */
  redactText(content: string): { redacted: string; redactionCount: number } {
    if (!content) {
      return { redacted: '', redactionCount: 0 };
    }

    let redacted = content;
    let totalCount = 0;

    for (const { pattern, replacement } of this.REDACTION_PATTERNS) {
      const matches = redacted.match(pattern);
      if (matches) {
        totalCount += matches.length;
        redacted = redacted.replace(pattern, replacement);
      }
    }

    return { redacted, redactionCount: totalCount };
  }

  /**
   * Redact sensitive data from JSON objects
   */
  redactJson(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = new Set([
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'authorization',
      'cookie',
      'sessionId',
      'session_id',
      'privateKey',
      'private_key',
      'credential',
    ]);

    const redactValue = (value: any, key?: string): any => {
      if (value === null || value === undefined) {
        return value;
      }

      // Check if this is a sensitive field by name
      if (key && sensitiveFields.has(key.toLowerCase())) {
        return '[REDACTED]';
      }

      if (typeof value === 'string') {
        return this.redactText(value).redacted;
      }

      if (Array.isArray(value)) {
        return value.map((item, i) => redactValue(item));
      }

      if (typeof value === 'object') {
        const result: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          result[k] = redactValue(v, k);
        }
        return result;
      }

      return value;
    };

    return redactValue(data);
  }

  /**
   * Redact headers specifically (common HTTP response/request headers)
   */
  redactHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = new Set([
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-csrf-token',
      'proxy-authorization',
      'www-authenticate',
    ]);

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = this.redactText(value).redacted;
      }
    }
    return result;
  }

  /**
   * Check if content contains any sensitive patterns
   * Useful for validation before storing
   */
  containsSensitiveData(content: string): {
    hasSensitiveData: boolean;
    foundPatterns: string[];
  } {
    const foundPatterns: string[] = [];

    for (const { name, pattern } of this.REDACTION_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        foundPatterns.push(name);
      }
    }

    return {
      hasSensitiveData: foundPatterns.length > 0,
      foundPatterns,
    };
  }
}
