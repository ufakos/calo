import { Injectable, BadRequestException } from '@nestjs/common';
import * as psl from 'psl';
import { isIP } from 'net';

/**
 * HostValidatorService - CRITICAL SECURITY COMPONENT
 * 
 * This service validates and normalizes hostnames/domains to prevent:
 * - SSRF attacks via IP literals
 * - Access to internal/private networks
 * - DNS rebinding attacks
 * - Unauthorized multi-target scanning
 * 
 * SAFETY CONSTRAINTS ENFORCED:
 * - Only allows valid public domain names
 * - Blocks all IP addresses (IPv4 and IPv6)
 * - Blocks internal/private ranges (RFC1918, localhost, link-local)
 * - Validates against approved domain allowlist
 * - Extracts and validates eTLD+1 (effective top-level domain)
 */
@Injectable()
export class HostValidatorService {
  // Blocked TLDs and patterns
  private readonly BLOCKED_TLDS = new Set([
    'local',
    'localhost',
    'internal',
    'intranet',
    'corp',
    'home',
    'lan',
    'localdomain',
  ]);

  // Regex patterns for dangerous inputs
  private readonly DANGEROUS_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,  // Link-local
    /^::1$/,        // IPv6 localhost
    /^fc00:/i,      // IPv6 unique local
    /^fe80:/i,      // IPv6 link-local
    /^fd/i,         // IPv6 private
    /^0\.0\.0\.0$/,
    /^\[.*\]$/,     // IPv6 bracket notation
    /^metadata\./i, // Cloud metadata endpoints
    /^169\.254\.169\.254$/, // AWS metadata
    /^metadata\.google\./i, // GCP metadata
  ];

  /**
   * Validates that a hostname is safe for external requests
   * @throws BadRequestException if the host is invalid or dangerous
   */
  validateHost(host: string): { isValid: boolean; normalizedHost: string; etldPlusOne: string } {
    if (!host || typeof host !== 'string') {
      throw new BadRequestException('Host is required and must be a string');
    }

    // Normalize: lowercase, trim, remove trailing dots
    let normalizedHost = host.toLowerCase().trim().replace(/\.+$/, '');

    // Remove any protocol prefix if accidentally included
    normalizedHost = normalizedHost.replace(/^https?:\/\//i, '');

    // Remove any path/query components
    normalizedHost = normalizedHost.split('/')[0].split('?')[0].split('#')[0];

    // Remove port if present for validation
    const hostWithoutPort = normalizedHost.split(':')[0];

    // Check for IP address - BLOCK ALL IPs
    if (isIP(hostWithoutPort)) {
      throw new BadRequestException(
        'IP addresses are not allowed. Please use a domain name.',
      );
    }

    // Check for IPv6 bracket notation
    if (/^\[.*\]/.test(hostWithoutPort)) {
      throw new BadRequestException(
        'IPv6 addresses are not allowed. Please use a domain name.',
      );
    }

    // Check against dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(hostWithoutPort)) {
        throw new BadRequestException(
          'This host appears to be an internal or reserved address and cannot be scanned.',
        );
      }
    }

    // Validate hostname format
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(hostWithoutPort)) {
      throw new BadRequestException(
        'Invalid hostname format. Only alphanumeric characters, hyphens, and dots are allowed.',
      );
    }

    // Check for blocked TLDs
    const parts = hostWithoutPort.split('.');
    const tld = parts[parts.length - 1];
    if (this.BLOCKED_TLDS.has(tld)) {
      throw new BadRequestException(
        `The TLD ".${tld}" is not allowed. Please use a public domain.`,
      );
    }

    // Parse and validate as public suffix
    const parsed = psl.parse(hostWithoutPort);
    if ('error' in parsed && parsed.error) {
      const errorObj = parsed.error as { message?: string };
      throw new BadRequestException(
        `Invalid domain: ${errorObj.message || 'Parse error'}`,
      );
    }

    const parsedDomain = parsed as psl.ParsedDomain;
    if (!parsedDomain.domain) {
      throw new BadRequestException(
        'Could not extract a valid domain from the provided host.',
      );
    }

    // Ensure it's a valid registrable domain
    if (!parsedDomain.listed) {
      throw new BadRequestException(
        'The domain does not appear to be on a valid public suffix list.',
      );
    }

    return {
      isValid: true,
      normalizedHost: hostWithoutPort,
      etldPlusOne: parsedDomain.domain,
    };
  }

  /**
   * Validates a URL and extracts the host
   */
  validateUrl(url: string): {
    isValid: boolean;
    normalizedUrl: string;
    host: string;
    etldPlusOne: string;
  } {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('URL is required and must be a string');
    }

    let parsedUrl: URL;
    try {
      // Ensure HTTPS
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      parsedUrl = new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('Only HTTP and HTTPS protocols are allowed');
    }

    // Validate the host component
    const hostValidation = this.validateHost(parsedUrl.hostname);

    // Normalize to HTTPS for security
    parsedUrl.protocol = 'https:';

    return {
      isValid: true,
      normalizedUrl: parsedUrl.toString(),
      host: hostValidation.normalizedHost,
      etldPlusOne: hostValidation.etldPlusOne,
    };
  }

  /**
   * Checks if a subdomain belongs to the given base domain
   */
  isSubdomainOf(subdomain: string, baseDomain: string): boolean {
    const subValidation = this.validateHost(subdomain);
    const baseValidation = this.validateHost(baseDomain);

    // Check if they share the same eTLD+1
    if (subValidation.etldPlusOne !== baseValidation.etldPlusOne) {
      return false;
    }

    // Subdomain must end with the base domain
    return (
      subValidation.normalizedHost === baseValidation.normalizedHost ||
      subValidation.normalizedHost.endsWith(`.${baseValidation.normalizedHost}`)
    );
  }

  /**
   * Extracts the eTLD+1 (effective top-level domain plus one) from a host
   */
  getEtldPlusOne(host: string): string {
    const validation = this.validateHost(host);
    return validation.etldPlusOne;
  }

  /**
   * Validates that the target is within the approved scope
   */
  validateTargetInScope(
    target: string,
    approvedDomains: string[],
  ): boolean {
    if (!approvedDomains || approvedDomains.length === 0) {
      throw new BadRequestException(
        'No approved domains configured. Please add domains to the assessment scope.',
      );
    }

    const targetValidation = this.validateHost(target);

    for (const approved of approvedDomains) {
      try {
        const approvedValidation = this.validateHost(approved);
        
        // Exact match
        if (targetValidation.normalizedHost === approvedValidation.normalizedHost) {
          return true;
        }

        // Subdomain of approved domain
        if (this.isSubdomainOf(targetValidation.normalizedHost, approvedValidation.normalizedHost)) {
          return true;
        }
      } catch {
        // Skip invalid approved domains
        continue;
      }
    }

    throw new BadRequestException(
      `Target "${target}" is not within the approved scope. ` +
      `Approved domains: ${approvedDomains.join(', ')}`,
    );
  }
}
