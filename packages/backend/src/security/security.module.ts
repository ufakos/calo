import { Module, Global } from '@nestjs/common';
import { HostValidatorService } from './host-validator.service';
import { SsrfGuardService } from './ssrf-guard.service';
import { RedactionService } from './redaction.service';
import { RateLimiterService } from './rate-limiter.service';

@Global()
@Module({
  providers: [
    HostValidatorService,
    SsrfGuardService,
    RedactionService,
    RateLimiterService,
  ],
  exports: [
    HostValidatorService,
    SsrfGuardService,
    RedactionService,
    RateLimiterService,
  ],
})
export class SecurityModule {}
