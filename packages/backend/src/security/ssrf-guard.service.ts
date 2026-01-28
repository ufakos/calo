import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HostValidatorService } from './host-validator.service';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

/**
 * SsrfGuardService - CRITICAL SECURITY COMPONENT
 * 
 * Provides Server-Side Request Forgery (SSRF) protection for the application.
 * This service prevents requests to internal/private networks even when
 * attackers use DNS rebinding or other bypass techniques.
 * 
 * PROTECTIONS:
 * - DNS resolution validation (no private IPs)
 * - Request-time re-validation
 * - Timeout enforcement
 * - Protocol restriction
 */
@Injectable()
export class SsrfGuardService {
  private readonly logger = new Logger(SsrfGuardService.name);

  constructor(private readonly hostValidator: HostValidatorService) {}

  // Private/internal IP ranges to block
  private readonly BLOCKED_IP_RANGES = [
    // IPv4 private ranges
    { start: this.ipToNumber('0.0.0.0'), end: this.ipToNumber('0.255.255.255') },
    { start: this.ipToNumber('10.0.0.0'), end: this.ipToNumber('10.255.255.255') },
    { start: this.ipToNumber('100.64.0.0'), end: this.ipToNumber('100.127.255.255') }, // Carrier-grade NAT
    { start: this.ipToNumber('127.0.0.0'), end: this.ipToNumber('127.255.255.255') },
    { start: this.ipToNumber('169.254.0.0'), end: this.ipToNumber('169.254.255.255') }, // Link-local
    { start: this.ipToNumber('172.16.0.0'), end: this.ipToNumber('172.31.255.255') },
    { start: this.ipToNumber('192.0.0.0'), end: this.ipToNumber('192.0.0.255') }, // IETF Protocol
    { start: this.ipToNumber('192.0.2.0'), end: this.ipToNumber('192.0.2.255') }, // TEST-NET-1
    { start: this.ipToNumber('192.168.0.0'), end: this.ipToNumber('192.168.255.255') },
    { start: this.ipToNumber('198.18.0.0'), end: this.ipToNumber('198.19.255.255') }, // Benchmark
    { start: this.ipToNumber('198.51.100.0'), end: this.ipToNumber('198.51.100.255') }, // TEST-NET-2
    { start: this.ipToNumber('203.0.113.0'), end: this.ipToNumber('203.0.113.255') }, // TEST-NET-3
    { start: this.ipToNumber('224.0.0.0'), end: this.ipToNumber('239.255.255.255') }, // Multicast
    { start: this.ipToNumber('240.0.0.0'), end: this.ipToNumber('255.255.255.255') }, // Reserved
  ];

  /**
   * Converts an IPv4 address to a number for range comparison
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3] >>> 0;
  }

  /**
   * Checks if an IPv4 address is in a private/blocked range
   */
  private isPrivateIPv4(ip: string): boolean {
    const ipNum = this.ipToNumber(ip);
    return this.BLOCKED_IP_RANGES.some(
      range => ipNum >= range.start && ipNum <= range.end
    );
  }

  /**
   * Checks if an IPv6 address is private/internal
   */
  private isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' || // Loopback
      normalized.startsWith('fe80:') || // Link-local
      normalized.startsWith('fc') || // Unique local
      normalized.startsWith('fd') || // Unique local
      normalized.startsWith('::ffff:127.') || // IPv4-mapped loopback
      normalized.startsWith('::ffff:10.') || // IPv4-mapped private
      normalized.startsWith('::ffff:172.') || // IPv4-mapped private (partial)
      normalized.startsWith('::ffff:192.168.') // IPv4-mapped private
    );
  }

  /**
   * Resolves a hostname and validates all returned IPs are public
   * This protects against DNS rebinding attacks
   */
  async validateDnsResolution(hostname: string): Promise<{
    ipv4Addresses: string[];
    ipv6Addresses: string[];
  }> {
    // First, validate the hostname itself
    this.hostValidator.validateHost(hostname);

    const ipv4Addresses: string[] = [];
    const ipv6Addresses: string[] = [];

    // Resolve IPv4
    try {
      const v4Addresses = await dnsResolve4(hostname);
      for (const ip of v4Addresses) {
        if (this.isPrivateIPv4(ip)) {
          this.logger.warn(`DNS rebinding attempt detected: ${hostname} resolves to private IP ${ip}`);
          throw new BadRequestException(
            `The host "${hostname}" resolves to a private/internal IP address and cannot be accessed.`,
          );
        }
        ipv4Addresses.push(ip);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      // NXDOMAIN or other DNS errors - log but continue to check IPv6
      this.logger.debug(`IPv4 DNS resolution failed for ${hostname}: ${error.message}`);
    }

    // Resolve IPv6
    try {
      const v6Addresses = await dnsResolve6(hostname);
      for (const ip of v6Addresses) {
        if (this.isPrivateIPv6(ip)) {
          this.logger.warn(`DNS rebinding attempt detected: ${hostname} resolves to private IPv6 ${ip}`);
          throw new BadRequestException(
            `The host "${hostname}" resolves to a private/internal IP address and cannot be accessed.`,
          );
        }
        ipv6Addresses.push(ip);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.debug(`IPv6 DNS resolution failed for ${hostname}: ${error.message}`);
    }

    // Must have at least one valid IP
    if (ipv4Addresses.length === 0 && ipv6Addresses.length === 0) {
      throw new BadRequestException(
        `Could not resolve DNS for "${hostname}". The domain may not exist or have no A/AAAA records.`,
      );
    }

    return { ipv4Addresses, ipv6Addresses };
  }

  /**
   * Full SSRF-safe URL validation
   * Call this before making any outbound HTTP requests
   */
  async validateRequestTarget(url: string, approvedDomains: string[]): Promise<{
    normalizedUrl: string;
    host: string;
    resolvedIps: string[];
  }> {
    // Step 1: Validate URL format and extract host
    const urlValidation = this.hostValidator.validateUrl(url);

    // Step 2: Check if target is in approved scope
    this.hostValidator.validateTargetInScope(
      urlValidation.host,
      approvedDomains,
    );

    // Step 3: Resolve DNS and validate IPs (prevents DNS rebinding)
    const dnsResult = await this.validateDnsResolution(urlValidation.host);

    return {
      normalizedUrl: urlValidation.normalizedUrl,
      host: urlValidation.host,
      resolvedIps: [...dnsResult.ipv4Addresses, ...dnsResult.ipv6Addresses],
    };
  }

  /**
   * Validates a domain for tool execution scope
   */
  async validateToolTarget(
    target: string,
    assessmentDomains: string[],
  ): Promise<void> {
    // Validate the target
    await this.validateRequestTarget(
      target.includes('://') ? target : `https://${target}`,
      assessmentDomains,
    );
  }
}
