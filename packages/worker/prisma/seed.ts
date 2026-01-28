/**
 * Prisma Seed Script
 * 
 * Seeds the database with sample data for Calo assessment.
 * Run with: npx prisma db seed
 */

import { PrismaClient, UserRole, AssessmentStatus, AssetType, Severity, ActionStatus, AuditControlStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@securescope.io' },
    update: {},
    create: {
      email: 'admin@securescope.io',
      password: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Calo organization
  const calo = await prisma.organization.upsert({
    where: { domain: 'calo.app' },
    update: {},
    create: {
      name: 'Calo',
      domain: 'calo.app',
    },
  });
  console.log('✅ Created organization:', calo.name);

  // Add approved domains
  const domains = ['calo.app', 'api.calo.app', 'app.calo.app'];
  for (const domain of domains) {
    await prisma.approvedDomain.upsert({
      where: { 
        organizationId_domain: {
          organizationId: calo.id,
          domain,
        },
      },
      update: {},
      create: {
        organizationId: calo.id,
        domain,
      },
    });
  }
  console.log('✅ Added approved domains');

  // Create sample assessment
  const assessment = await prisma.assessment.upsert({
    where: { id: 'sample-calo-assessment' },
    update: {},
    create: {
      id: 'sample-calo-assessment',
      name: 'Calo Q1 2024 Security Posture Assessment',
      organizationId: calo.id,
      createdById: admin.id,
      status: AssessmentStatus.IN_PROGRESS,
    },
  });
  console.log('✅ Created assessment:', assessment.name);

  // Create sample assets
  const assetData = [
    { type: AssetType.DOMAIN, value: 'calo.app', label: 'Main website' },
    { type: AssetType.DOMAIN, value: 'api.calo.app', label: 'API endpoint' },
    { type: AssetType.DOMAIN, value: 'app.calo.app', label: 'Web application' },
    { type: AssetType.IP, value: '104.21.xxx.xxx', label: 'Cloudflare CDN' },
    { type: AssetType.SERVICE, value: 'HTTPS/443', label: 'Web server' },
  ];
  
  for (const asset of assetData) {
    await prisma.asset.create({
      data: {
        assessmentId: assessment.id,
        ...asset,
      },
    });
  }
  console.log('✅ Created sample assets');

  // Create sample observations
  const observations = [
    {
      title: 'TLS Configuration - Good',
      description: 'TLS 1.3 is properly configured with modern cipher suites. No vulnerable protocols detected.',
      severity: Severity.INFO,
      category: 'TLS/SSL',
    },
    {
      title: 'Missing Content-Security-Policy Header',
      description: 'The Content-Security-Policy header is not configured, which could allow XSS attacks.',
      severity: Severity.MEDIUM,
      category: 'Security Headers',
    },
    {
      title: 'Missing Permissions-Policy Header',
      description: 'Permissions-Policy (formerly Feature-Policy) header is not set.',
      severity: Severity.LOW,
      category: 'Security Headers',
    },
    {
      title: 'CORS Configuration - Reflective',
      description: 'API endpoint reflects Origin header in Access-Control-Allow-Origin, which could be exploited.',
      severity: Severity.HIGH,
      category: 'CORS',
    },
    {
      title: 'Cloudflare Protection Detected',
      description: 'Application is behind Cloudflare CDN/WAF providing DDoS protection.',
      severity: Severity.INFO,
      category: 'Infrastructure',
    },
  ];

  for (const obs of observations) {
    await prisma.observation.create({
      data: {
        assessmentId: assessment.id,
        ...obs,
      },
    });
  }
  console.log('✅ Created sample observations');

  // Create top 5 risks
  const risks = [
    {
      rank: 1,
      title: 'Reflective CORS Configuration',
      description: 'The API reflects any Origin in CORS headers, potentially allowing cross-origin attacks when combined with credentials.',
      severity: Severity.HIGH,
      likelihood: 'MEDIUM',
      impact: 'HIGH',
      businessImpact: 'User data exposure via malicious third-party sites',
    },
    {
      rank: 2,
      title: 'Missing Content Security Policy',
      description: 'Without CSP, the application is more vulnerable to XSS attacks that could steal user sessions or data.',
      severity: Severity.MEDIUM,
      likelihood: 'MEDIUM',
      impact: 'MEDIUM',
      businessImpact: 'Potential for account takeover via XSS',
    },
    {
      rank: 3,
      title: 'Subdomain Takeover Risk',
      description: 'Several subdomains point to unclaimed resources that could be taken over by attackers.',
      severity: Severity.MEDIUM,
      likelihood: 'LOW',
      impact: 'HIGH',
      businessImpact: 'Brand damage and phishing attacks',
    },
    {
      rank: 4,
      title: 'Technology Fingerprinting Exposure',
      description: 'Server headers reveal technology stack (Next.js, Vercel) which aids targeted attacks.',
      severity: Severity.LOW,
      likelihood: 'HIGH',
      impact: 'LOW',
      businessImpact: 'Provides attackers reconnaissance information',
    },
    {
      rank: 5,
      title: 'Missing Rate Limiting on Public APIs',
      description: 'Public endpoints lack visible rate limiting which could enable abuse.',
      severity: Severity.LOW,
      likelihood: 'MEDIUM',
      impact: 'LOW',
      businessImpact: 'API abuse and increased infrastructure costs',
    },
  ];

  for (const risk of risks) {
    await prisma.risk.create({
      data: {
        assessmentId: assessment.id,
        ...risk,
      },
    });
  }
  console.log('✅ Created top 5 risks');

  // Create action items
  const actions = [
    {
      title: 'Configure strict CORS policy',
      description: 'Replace reflective CORS with explicit allowlist of trusted origins.',
      priority: 'HIGH',
      phase: 'PRE_ONBOARDING',
      status: ActionStatus.PENDING,
    },
    {
      title: 'Implement Content Security Policy',
      description: 'Add CSP header starting with report-only mode, then enforce.',
      priority: 'HIGH',
      phase: 'WEEK_1',
      status: ActionStatus.PENDING,
    },
    {
      title: 'Remove server version headers',
      description: 'Configure server to not expose technology stack in headers.',
      priority: 'MEDIUM',
      phase: 'WEEK_1',
      status: ActionStatus.PENDING,
    },
    {
      title: 'Audit DNS records for dangling pointers',
      description: 'Review all DNS records and remove or claim orphaned resources.',
      priority: 'MEDIUM',
      phase: 'WEEK_2',
      status: ActionStatus.PENDING,
    },
    {
      title: 'Implement visible rate limiting',
      description: 'Add rate limiting with proper 429 responses and Retry-After headers.',
      priority: 'LOW',
      phase: 'WEEK_2',
      status: ActionStatus.PENDING,
    },
  ];

  for (const action of actions) {
    await prisma.actionItem.create({
      data: {
        assessmentId: assessment.id,
        ...action,
      },
    });
  }
  console.log('✅ Created action items');

  // Create audit controls
  const auditControls = [
    {
      controlId: 'TLS-001',
      framework: 'CIS',
      description: 'Ensure TLS 1.2+ is enforced',
      status: AuditControlStatus.PASS,
      automatedCheck: true,
      evidenceRef: 'tool-runs/tls-check-001.json',
    },
    {
      controlId: 'HDR-001',
      framework: 'OWASP',
      description: 'Ensure HSTS header is present',
      status: AuditControlStatus.PASS,
      automatedCheck: true,
      evidenceRef: 'tool-runs/headers-001.json',
    },
    {
      controlId: 'HDR-002',
      framework: 'OWASP',
      description: 'Ensure CSP header is configured',
      status: AuditControlStatus.FAIL,
      automatedCheck: true,
      evidenceRef: 'tool-runs/headers-001.json',
    },
    {
      controlId: 'CORS-001',
      framework: 'OWASP',
      description: 'Ensure CORS is properly restricted',
      status: AuditControlStatus.FAIL,
      automatedCheck: true,
      evidenceRef: 'tool-runs/cors-001.json',
    },
  ];

  for (const control of auditControls) {
    await prisma.auditControl.create({
      data: {
        assessmentId: assessment.id,
        ...control,
      },
    });
  }
  console.log('✅ Created audit controls');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nLogin credentials:');
  console.log('  Email: admin@securescope.io');
  console.log('  Password: admin123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
