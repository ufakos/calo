import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AssetsModule } from './assets/assets.module';
import { ObservationsModule } from './observations/observations.module';
import { EvidenceModule } from './evidence/evidence.module';
import { RisksModule } from './risks/risks.module';
import { ActionsModule } from './actions/actions.module';
import { AuditControlsModule } from './audit-controls/audit-controls.module';
import { ToolRunsModule } from './tool-runs/tool-runs.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // BullMQ for background jobs
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
      },
    }),

    // Core modules
    PrismaModule,
    AuthModule,
    SecurityModule,
    StorageModule,

    // Feature modules
    OrganizationsModule,
    AssessmentsModule,
    AssetsModule,
    ObservationsModule,
    EvidenceModule,
    RisksModule,
    ActionsModule,
    AuditControlsModule,
    ToolRunsModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
