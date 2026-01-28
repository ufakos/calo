'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSearch, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAssessments()
      .then(setAssessments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
    DRAFT: 'secondary',
    IN_PROGRESS: 'default',
    COMPLETED: 'outline',
    ARCHIVED: 'secondary',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessments</h1>
          <p className="text-muted-foreground">
            Manage your security posture assessments
          </p>
        </div>
        <Link href="/dashboard/assessments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
          <CardDescription>
            {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No assessments yet</p>
              <Link href="/dashboard/assessments/new">
                <Button>Start your first assessment</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/assessments/${assessment.id}`}
                        className="font-medium hover:underline"
                      >
                        {assessment.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assessment.organization?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[assessment.status] || 'default'}>
                        {assessment.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(assessment.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
