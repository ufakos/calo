'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function NewOrganizationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const org = await api.createOrganization({ name, domain });
      toast({
        title: 'Organization created',
        description: `${name} has been added successfully`,
      });
      router.push(`/dashboard/organizations/${org.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to create organization',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Organization</h1>
          <p className="text-muted-foreground">
            Register a new organization for assessment
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Enter the organization&apos;s information and primary domain
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="Calo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Primary Domain</Label>
              <Input
                id="domain"
                placeholder="calo.app"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This domain will be used as the default scope for assessments
              </p>
            </div>
          </CardContent>
          <div className="p-6 pt-0 flex justify-end gap-4">
            <Link href="/dashboard/organizations">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
