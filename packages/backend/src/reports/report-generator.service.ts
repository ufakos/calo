import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ReportMode } from '@prisma/client';

export interface ReportData {
  organization: any;
  assessment: any;
  assets: any[];
  observations: any[];
  risks: any[];
  actionItems: any[];
  auditControls: any[];
  evidences: any[];
  toolRuns: any[];
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Gather all data needed for report generation
   */
  async gatherReportData(assessmentId: string): Promise<ReportData> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { organization: true, createdBy: { select: { name: true, email: true } } },
    });

    if (!assessment) throw new Error('Assessment not found');

    const [assets, observations, risks, actionItems, auditControls, evidencesRaw, toolRunsRaw] =
      await Promise.all([
        this.prisma.asset.findMany({ where: { assessmentId }, orderBy: { type: 'asc' } }),
        this.prisma.observation.findMany({ where: { assessmentId }, orderBy: { severity: 'desc' } }),
        this.prisma.risk.findMany({ where: { assessmentId }, orderBy: { rank: 'asc' } }),
        this.prisma.actionItem.findMany({ where: { assessmentId }, orderBy: { phase: 'asc' } }),
        this.prisma.auditControl.findMany({ where: { assessmentId } }),
        this.prisma.evidence.findMany({
          where: { assessmentId },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            sourceUrl: true,
            content: true,
            storageKey: true,
            mimeType: true,
            fileSize: true,
            redactionStatus: true,
            createdAt: true,
          },
        }),
        this.prisma.toolRun.findMany({
          where: { assessmentId, status: 'COMPLETED' },
          select: {
            id: true,
            toolName: true,
            target: true,
            parametersJson: true,
            resultSummary: true,
            stdoutRef: true,
            stderrRef: true,
            startedAt: true,
            finishedAt: true,
            durationMs: true,
            exitCode: true,
            errorMessage: true,
            createdAt: true,
          },
        }),
      ]);

    const evidences = await Promise.all(
      evidencesRaw.map(async (e) => {
        const isImage = !!(e.storageKey && e.mimeType?.startsWith('image/'));
        let imageDataUrl: string | undefined;

        if (isImage && e.storageKey) {
          const buffer = await this.storage.getEvidence(e.storageKey);
          imageDataUrl = `data:${e.mimeType};base64,${buffer.toString('base64')}`;
        }

        return {
          ...e,
          imageDataUrl,
          downloadUrl: e.storageKey && !isImage
            ? await this.storage.getPresignedUrl(
                this.storage.BUCKETS.EVIDENCE,
                e.storageKey,
                60 * 60 * 24 * 7,
              )
            : undefined,
        };
      }),
    );

    const toolRuns = await Promise.all(
      toolRunsRaw.map(async (r) => ({
        ...r,
        stdoutUrl: r.stdoutRef
          ? await this.storage.getPresignedUrl(
              this.storage.BUCKETS.TOOL_OUTPUTS,
              r.stdoutRef,
              60 * 60 * 24 * 7,
            )
          : undefined,
        stderrUrl: r.stderrRef
          ? await this.storage.getPresignedUrl(
              this.storage.BUCKETS.TOOL_OUTPUTS,
              r.stderrRef,
              60 * 60 * 24 * 7,
            )
          : undefined,
      })),
    );

    return {
      organization: assessment.organization,
      assessment,
      assets,
      observations,
      risks,
      actionItems,
      auditControls,
      evidences,
      toolRuns,
    };
  }

  /**
   * Generate Markdown report
   */
  generateMarkdown(data: ReportData, mode: ReportMode): string {
    if (mode === 'THREE_PAGE') {
      return this.generateThreePageMarkdown(data);
    }
    const { organization, assessment, assets, observations, risks, actionItems, auditControls, evidences, toolRuns } = data;
    const isCompact = mode === 'EXECUTIVE';
    const evidenceById = new Map(evidences.map((e) => [e.id, e]));

    const renderEvidence = (e: any) => {
      const title = e.title || e.id;
      const source = e.sourceUrl ? `[Source](${e.sourceUrl})` : 'N/A';
      const isImage = !!e.imageDataUrl;
      const fileLink = !isImage && e.downloadUrl ? `[Download](${e.downloadUrl})` : 'N/A';
      const imageEmbed = isImage
        ? `\n![${title}](${e.imageDataUrl})\n`
        : '';
      const contentBlock = e.content ? `\n\n\`\`\`\n${e.content}\n\`\`\`\n` : '';

      return `#### Evidence: ${title}

- **Type:** ${e.type}
- **Description:** ${e.description || 'N/A'}
- **Source:** ${source}
- **File:** ${isImage ? 'Embedded image' : fileLink}
- **Redaction:** ${e.redactionStatus || 'N/A'}
- **Created:** ${new Date(e.createdAt).toISOString()}
${imageEmbed}${contentBlock}`;
    };

    let md = `# Security Posture Assessment Report

**Organization:** ${organization.name}  
**Primary Domain:** ${organization.primaryDomain}  
**Assessment Date:** ${new Date(assessment.createdAt).toLocaleDateString()}  
**Status:** ${assessment.status}

---

## Executive Summary

This report presents the findings from a black-box security posture assessment of ${organization.name}'s public-facing infrastructure. The assessment focused on identifying security risks through non-intrusive observation of publicly accessible services.

### Key Findings

- **Total Assets Identified:** ${assets.length}
- **Observations:** ${observations.length}
- **High/Critical Risks:** ${risks.filter(r => ['MAJOR', 'SEVERE'].includes(r.impact)).length}

---

## 1. Attack Surface Map

| Type | Asset | Confidence | Status |
|------|-------|------------|--------|
${assets.slice(0, isCompact ? 10 : 100).map(a => 
  `| ${a.type} | ${a.value} | ${a.confidence} | ${a.approved ? '✅ Approved' : '⏳ Pending'} |`
).join('\n')}

${assets.length > 10 && isCompact ? `\n*... and ${assets.length - 10} more assets*\n` : ''}

${!isCompact ? `\n### Asset Details\n\n${assets.map(a => {
  const evidenceBlocks = (a.evidenceRefs || [])
    .map((id: string) => evidenceById.get(id))
    .filter(Boolean)
    .map(renderEvidence)
    .join('\n');

  return `#### ${a.displayName || a.value}

- **Type:** ${a.type}
- **Value:** ${a.value}
- **Confidence:** ${a.confidence}
- **Status:** ${a.approved ? 'Approved' : 'Pending'}
- **Discovered By:** ${a.discoveredBy || 'N/A'}
- **Notes:** ${a.notes || 'N/A'}
- **Metadata:** ${a.metadata ? `\`\`\`json\n${JSON.stringify(a.metadata, null, 2)}\n\`\`\`` : 'N/A'}
${evidenceBlocks ? `\n**Evidence**\n\n${evidenceBlocks}` : ''}
`;
}).join('\n')}` : ''}

---

## 2. Top 5 Risks

${risks.slice(0, 5).map(r => `
### Risk #${r.rank}: ${r.title}

- **Impact:** ${r.impact}
- **Likelihood:** ${r.likelihood}
- **Blast Radius:** ${r.blastRadius || 'Not specified'}
- **Ease to Fix:** ${r.easeToFix || 'Not specified'}

${r.description || ''}

**Recommendation:** ${r.recommendation || 'See detailed findings.'}
`).join('\n')}

---

## 3. Hands-on Observations

${isCompact
  ? observations.slice(0, 5).map(o => `
### [${o.severity}] ${o.title}

${o.summary}
`).join('\n')
  : observations.map(o => {
      const evidenceBlocks = (o.evidenceRefs || [])
        .map((id: string) => evidenceById.get(id))
        .filter(Boolean)
        .map(renderEvidence)
        .join('\n');

      return `
### [${o.severity}] ${o.title}

**Category:** ${o.category}

${o.summary}

${o.details || ''}

${o.analystNotes ? `**Analyst Notes:** ${o.analystNotes}` : ''}

${evidenceBlocks ? `\n**Evidence**\n\n${evidenceBlocks}` : ''}
`;
    }).join('\n')}

---

## 4. Action Plan

### Pre-Onboarding

${actionItems.filter(a => a.phase === 'PRE_ONBOARDING').map(a => `
- **[${a.priority}] ${a.title}** (${a.ownerType})
  ${a.description || ''}
  ${a.successMetric ? `*Success Metric: ${a.successMetric}*` : ''}
`).join('\n')}

### First 2 Weeks

${actionItems.filter(a => a.phase === 'FIRST_2_WEEKS').map(a => `
- **[${a.priority}] ${a.title}** (${a.ownerType})
  ${a.description || ''}
  ${a.successMetric ? `*Success Metric: ${a.successMetric}*` : ''}
`).join('\n')}

---

## 5. Audit Readiness

${auditControls.map(c => `
### ${c.title}

${c.description || ''}

- **Frequency:** ${c.frequency}
- **Automated:** ${c.automated ? 'Yes' : 'No'}
- **Evidence Generated:** ${c.evidenceGenerated || 'Manual documentation'}
${c.mappedFramework?.length ? `- **Framework Mapping:** ${c.mappedFramework.join(', ')}` : ''}
`).join('\n')}

---

## Appendix: Tool Runs & Outputs

${toolRuns.length === 0 ? 'No completed tool runs recorded.' : toolRuns.map(r => `
### ${r.toolName} on ${r.target}

- **Status:** COMPLETED
- **Started:** ${r.startedAt ? new Date(r.startedAt).toISOString() : 'N/A'}
- **Finished:** ${r.finishedAt ? new Date(r.finishedAt).toISOString() : 'N/A'}
- **Duration (ms):** ${r.durationMs ?? 'N/A'}
- **Exit Code:** ${r.exitCode ?? 'N/A'}

${r.parametersJson ? `**Parameters:**\n\n\`\`\`json\n${JSON.stringify(r.parametersJson, null, 2)}\n\`\`\`\n` : ''}
${r.resultSummary ? `**Result Summary:**\n\n${r.resultSummary}\n` : ''}
${r.stdoutUrl ? `**Stdout:** [Download](${r.stdoutUrl})\n` : ''}
${r.stderrUrl ? `**Stderr:** [Download](${r.stderrUrl})\n` : ''}
`).join('\n')}

---

## Appendix: Scope & Assumptions

### Scope
\`\`\`json
${JSON.stringify(assessment.scopeJson || {}, null, 2)}
\`\`\`

### Assumptions
${assessment.assumptionsText || 'No specific assumptions documented.'}

### Constraints
${assessment.constraintsText || 'No specific constraints documented.'}

---

*Report generated on ${new Date().toISOString()}*
`;

    return md;
  }

  private generateThreePageMarkdown(data: ReportData): string {
    const { organization, assessment, assets, observations, risks, actionItems, auditControls, evidences } = data;
    const evidenceIndex = evidences.map((e, i) => ({ label: `E${i + 1}`, ...e }));
    const evidenceById = new Map(evidenceIndex.map((e) => [e.id, e]));

    const attachEvidenceLabels = (refs?: string[]) =>
      (refs || [])
        .map((id) => evidenceById.get(id)?.label)
        .filter(Boolean)
        .join(', ') || '—';

    const renderEvidence = (e: any) => {
      const title = e.title || e.id;
      const source = e.sourceUrl ? `[Source](${e.sourceUrl})` : 'N/A';
      const isImage = !!e.imageDataUrl;
      const fileLink = !isImage && e.downloadUrl ? `[Download](${e.downloadUrl})` : 'N/A';
      const imageEmbed = isImage ? `\n![${title}](${e.imageDataUrl})\n` : '';
      const contentBlock = e.content ? `\n\n\`\`\`\n${e.content}\n\`\`\`\n` : '';

      return `**${e.label} — ${title}**\n\n- **Type:** ${e.type}\n- **Description:** ${e.description || 'N/A'}\n- **Source:** ${source}\n- **File:** ${isImage ? 'Embedded image' : fileLink}\n- **Redaction:** ${e.redactionStatus || 'N/A'}\n- **Created:** ${new Date(e.createdAt).toISOString()}\n${imageEmbed}${contentBlock}`;
    };

    const topObservations = observations.slice(0, 8);
    const topRisks = risks.slice(0, 5);
    const topAssets = assets.slice(0, 10);
    const topActions = actionItems.slice(0, 3);
    const topControls = auditControls.slice(0, 3);

    return `# Security Posture Assessment (Black‑Box, Public Surface)

**Organization:** ${organization.name}  
**Website:** ${organization.domain ? `https://${organization.domain}` : 'https://calo.app'}  
**Assessor:** [Your Name], Senior Security Engineer  
**Date:** ${new Date(assessment.createdAt).toLocaleDateString()}

---

## 0. Scope, Constraints, and Assumptions

**Objective**  
Assess Calo’s external security posture using only what is accessible to a normal, unauthenticated user, without purchasing the service or accessing paid features.

**In Scope**  
Public web properties (marketing site, help/docs, auth entry points)  
Pre‑authentication flows (signup, login, password reset, OTP where applicable)  
Publicly observable APIs, headers, and network behavior  
Public mobile app metadata (App Store / Play Store listings)

**Out of Scope**  
Authenticated or paid functionality  
Internal systems (repos, logs, cloud consoles)  
High‑volume or disruptive testing

**Constraints**  
Low‑volume, non‑disruptive testing only  
No brute force, credential stuffing, scraping, or bypass attempts  
No access to other users’ data

**Assumptions**  
Free account creation is allowed for observation of pre‑auth behavior (if applicable)  
Observations are point‑in‑time and may change as the platform evolves

---

## 1. Attack Surface Map (Public Footprint)

**Identified Domains**  
Primary marketing site: calo.app  
${assets.length ? topAssets.map((a) => `- ${a.value}`).join('\n') : '[Additional discovered domains or redirects]'}

**Key Entry Points**  
Homepage / marketing pages  
Signup / login  
Password reset / OTP flows  
Checkout or pricing pages (no purchase performed)  
Help center / blog / careers

**Notes**  
[High‑level notes on separation of marketing vs app surfaces]

### 1.2 DNS and Subdomain Discovery (Passive)

**Methodology**  
Certificate Transparency review  
DNS record inspection (A, CNAME, MX, TXT)

**Observed Subdomains (High Confidence)**

| Subdomain | Purpose (Inferred) | Notes |
|---|---|---|
${topAssets.map((a) => `| ${a.value} | ${a.type} | ${a.notes || '—'} |`).join('\n') || '| [example.calo.app] | [API / CDN / Auth] | [Evidence basis] |'}

**Email Security Posture (High Level)**  
SPF: [Present / Missing]  
DKIM: [Present / Missing]  
DMARC: [Present / Missing / Policy]

### 1.3 Public APIs and Third‑Party Dependencies (Inferred)

**Observed From Browser / App Metadata**  
API hostnames: [api.example.com]  
CDN / WAF: [Cloudflare / Fastly / Akamai / Unknown]  
Identity provider: [Auth0 / Cognito / Custom / Unknown]  
Payments: [Stripe / Adyen / Unknown]  
Analytics / monitoring: [GA, Segment, Sentry, etc.]

**Risk Note**  
Reliance on third‑party services increases exposure to misconfiguration and supply‑chain risk.

---

## 2. Hands‑On Observations (Public + Pre‑Auth)

Evidence is redacted to remove identifiers, tokens, or sensitive metadata.

${topObservations.length ? topObservations.map((o) => `### [${o.severity}] ${o.title}

**Category:** ${o.category}  
${o.summary}

${o.details || ''}

${o.analystNotes ? `**Analyst Notes:** ${o.analystNotes}` : ''}

**Evidence:** ${attachEvidenceLabels(o.evidenceRefs)}
`).join('\n') : '_No observations recorded yet._'}

---

## 3. Top 5 Risks (Ranked)

Each risk ties back to observed signals above, even if the risk itself is inferred.

| Rank | Risk | Impact | Likelihood | Blast Radius | Ease to Fix | Evidence |
|---|---|---|---|---|---|---|
${topRisks.length ? topRisks.map((r) => `| ${r.rank} | ${r.title} | ${r.impact || '—'} | ${r.likelihood || '—'} | ${r.blastRadius || '—'} | ${r.easeToFix || '—'} | ${r.rationale || 'E?' } |`).join('\n') : `| 1 | [Risk title] | High | Medium | Broad | Easy | E3, E5 |
| 2 | [Risk title] | Medium | Medium | Moderate | Medium | E4 |
| 3 | [Risk title] | Medium | Low | Limited | Easy | E1, E2 |
| 4 | [Risk title] | Low | Medium | Limited | Easy | E6 |
| 5 | [Risk title] | Low | Low | Limited | Medium | E5 |`}

---

## 4. Action Plan That Ships

### 4.1 Pre‑Onboarding (Immediate Guardrails)
- Standardize security headers across all public endpoints
- Enforce secure cookie attributes and session lifetimes
- Apply rate limits to auth and reset flows
- Enable centralized logging and alerting for auth abuse
- Publish security.txt and vulnerability intake process

### 4.2 First 2 Weeks After Onboarding

| Initiative | Description | Owner | Success Metric |
|---|---|---|---|
${topActions.length ? topActions.map((a) => `| ${a.title} | ${a.description || '—'} | ${a.ownerType || 'Security'} | ${a.successMetric || 'Defined coverage'} |`).join('\n') : `| Header baseline | Enforce CSP/HSTS | Platform | 100% coverage |
| Auth hardening | Enumeration & rate‑limit review | Security | Reduced auth abuse alerts |
| Dependency review | Third‑party risk assessment | Security | Documented risk register |`}

---

## 5. Audit Readiness

${topControls.length ? topControls.map((c) => `**${c.title}**  
What: ${c.description || '—'}  
Evidence: ${c.evidenceGenerated || '—'}  
Frequency: ${c.frequency || 'ON_DEMAND'}  
`).join('\n') : `**Control 1: Access Control & MFA**  
What: Enforce MFA for privileged roles  
Evidence: IdP configuration screenshots, access reviews  
Frequency: Quarterly  

**Control 2: Vulnerability Management**  
What: Automated SAST/DAST/dependency scans  
Evidence: Scan reports and remediation tickets  
Frequency: Per release / weekly  

**Control 3: Change Management**  
What: PR reviews and approvals  
Evidence: CI logs, PR audit trail  
Frequency: Continuous`}

---

## Appendix: Evidence Index

${evidenceIndex.length ? evidenceIndex.map(renderEvidence).join('\n\n') : 'No evidence captured yet.'}
`;
  }

  /**
   * Generate HTML report (for PDF conversion)
   */
  generateHtml(data: ReportData, mode: ReportMode): string {
    const markdown = this.generateMarkdown(data, mode);
    
    // Basic markdown to HTML conversion
    let html = markdown
      .replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Assessment Report - ${data.organization.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    h3 { color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    .risk-high { color: #dc2626; }
    .risk-medium { color: #f59e0b; }
    .risk-low { color: #10b981; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }
}
