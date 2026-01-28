'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, FileSearch, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOrganizations(), api.getAssessments()])
      .then(([orgs, assmnts]) => {
        setOrganizations(orgs);
        setAssessments(assmnts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    IN_PROGRESS: 'default',
    COMPLETED: 'outline',
    ARCHIVED: 'secondary',
  };

  const recentAssessments = assessments.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your security assessments
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessments.filter((a) => a.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessments.filter((a) => a.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link href="/dashboard/assessments/new">
          <Button>Start New Assessment</Button>
        </Link>
        <Link href="/dashboard/organizations/new">
          <Button variant="outline">Add Organization</Button>
        </Link>
      </div>

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>Your latest security assessments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAssessments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assessments yet</p>
              <Link href="/dashboard/assessments/new">
                <Button variant="link">Start your first assessment</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAssessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  href={`/dashboard/assessments/${assessment.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <h3 className="font-medium">{assessment.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assessment.organization?.name || 'Unknown Organization'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={statusColors[assessment.status] || 'default'}>
                        {assessment.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(assessment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Organizations you&apos;re assessing</CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No organizations yet</p>
              <Link href="/dashboard/organizations/new">
                <Button variant="link">Add your first organization</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/dashboard/organizations/${org.id}`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <h3 className="font-medium">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">{org.domain}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {org._count?.assessments || 0} assessments
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
