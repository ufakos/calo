'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Play,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

const severityVariants: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [toolRuns, setToolRuns] = useState<any[]>([]);
  const [auditControls, setAuditControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTool, setRunningTool] = useState<string | null>(null);

  const assessmentId = params.id as string;

  useEffect(() => {
    if (!assessmentId) return;

    Promise.all([
      api.getAssessment(assessmentId),
      api.getAssets(assessmentId),
      api.getObservations(assessmentId),
      api.getRisks(assessmentId),
      api.getActions(assessmentId),
      api.getToolRuns(assessmentId),
      api.getAuditControls(assessmentId),
    ])
      .then(([asmt, astList, obsList, rskList, actList, trList, acList]) => {
        setAssessment(asmt);
        setAssets(astList);
        setObservations(obsList);
        setRisks(rskList);
        setActions(actList);
        setToolRuns(trList);
        setAuditControls(acList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assessmentId]);

  const runTool = async (toolName: string, target: string) => {
    setRunningTool(toolName);
    try {
      const result = await api.runTool({
        assessmentId,
        toolName,
        target,
      });
      toast({
        title: 'Tool queued',
        description: `${toolName} has been queued for execution`,
      });
      // Refresh tool runs
      const runs = await api.getToolRuns(assessmentId);
      setToolRuns(runs);
    } catch (error: any) {
      toast({
        title: 'Failed to run tool',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRunningTool(null);
    }
  };

  const generateReport = async (format: 'markdown' | 'html' | 'json') => {
    try {
      await api.generateReport(assessmentId, format);
      toast({
        title: 'Report generated',
        description: `${format.toUpperCase()} report has been generated`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to generate report',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessment) {
    return <div>Assessment not found</div>;
  }

  const domain = assessment.organization?.domain || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assessments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{assessment.name}</h1>
            <p className="text-muted-foreground">
              {assessment.organization?.name} • {domain}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={assessment.status === 'COMPLETED' ? 'outline' : 'default'}>
            {assessment.status.replace('_', ' ')}
          </Badge>
          <Button onClick={() => generateReport('html')}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{observations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{risks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tool Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toolRuns.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="risks">Top Risks</TabsTrigger>
          <TabsTrigger value="actions">Action Plan</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="audit">Audit Controls</TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attack Surface</CardTitle>
                  <CardDescription>Discovered public assets</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>First Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No assets discovered yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Badge variant="outline">{asset.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{asset.value}</TableCell>
                        <TableCell>{asset.label || '-'}</TableCell>
                        <TableCell>
                          {new Date(asset.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Observations Tab */}
        <TabsContent value="observations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Security Observations</CardTitle>
                  <CardDescription>Findings from the assessment</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Observation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {observations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No observations recorded yet
                  </div>
                ) : (
                  observations.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{obs.title}</h3>
                        <Badge variant={severityVariants[obs.severity] || 'info'}>
                          {obs.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{obs.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{obs.category}</span>
                        <span>{obs.evidence?.length || 0} evidence items</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top 5 Risks</CardTitle>
                  <CardDescription>Prioritized risk assessment</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {risks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No risks identified yet
                  </div>
                ) : (
                  risks
                    .sort((a, b) => a.rank - b.rank)
                    .slice(0, 5)
                    .map((risk) => (
                      <div
                        key={risk.id}
                        className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{risk.rank}
                          </span>
                          <div className="flex-1">
                            <h3 className="font-medium">{risk.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {risk.description}
                            </p>
                          </div>
                          <Badge variant={severityVariants[risk.severity] || 'info'}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground ml-12">
                          <span>Likelihood: {risk.likelihood}</span>
                          <span>Impact: {risk.impact}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Action Plan</CardTitle>
                  <CardDescription>Pre-onboarding + First 2 weeks</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No actions planned yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <Badge variant="outline">{action.phase}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={action.priority === 'HIGH' ? 'high' : 'secondary'}>
                            {action.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {action.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={action.status === 'COMPLETED' ? 'outline' : 'secondary'}>
                            {action.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Available Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Security Tools</CardTitle>
                <CardDescription>Run safe, non-intrusive checks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'TLS_CHECK', label: 'TLS/SSL Check', desc: 'Analyze certificate and configuration' },
                  { name: 'HEADER_CHECK', label: 'HTTP Headers', desc: 'Collect response headers' },
                  { name: 'SECURITY_HEADERS', label: 'Security Headers', desc: 'Analyze security headers' },
                  { name: 'CORS_CHECK', label: 'CORS Check', desc: 'Test CORS configuration' },
                  { name: 'DNS_LOOKUP', label: 'DNS Lookup', desc: 'Query DNS records' },
                  { name: 'CERT_TRANSPARENCY', label: 'CT Logs', desc: 'Find subdomains from CT logs' },
                  { name: 'TECH_FINGERPRINT', label: 'Tech Fingerprint', desc: 'Detect technologies' },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{tool.label}</p>
                      <p className="text-sm text-muted-foreground">{tool.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runTool(tool.name, domain)}
                      disabled={runningTool === tool.name}
                    >
                      {runningTool === tool.name ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tool Runs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Runs</CardTitle>
                <CardDescription>Tool execution history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {toolRuns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tools run yet
                    </div>
                  ) : (
                    toolRuns.slice(0, 10).map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{run.toolName}</p>
                          <p className="text-xs text-muted-foreground">
                            {run.target}
                          </p>
                        </div>
                        <Badge
                          variant={
                            run.status === 'COMPLETED'
                              ? 'outline'
                              : run.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Controls Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Controls</CardTitle>
              <CardDescription>Automated compliance checks with evidence</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control</TableHead>
                    <TableHead>Framework</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditControls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No audit controls configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditControls.map((control) => (
                      <TableRow key={control.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{control.controlId}</p>
                            <p className="text-sm text-muted-foreground">
                              {control.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{control.framework}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              control.status === 'PASS'
                                ? 'outline'
                                : control.status === 'FAIL'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {control.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {control.evidenceRef ? (
                            <a
                              href={control.evidenceRef}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
