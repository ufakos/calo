'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const steps = [
  { id: 1, name: 'Organization', description: 'Select or create organization' },
  { id: 2, name: 'Assessment', description: 'Name your assessment' },
  { id: 3, name: 'Scope', description: 'Define target scope' },
  { id: 4, name: 'Review', description: 'Confirm and start' },
];

export default function NewAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);

  // Form state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [assessmentName, setAssessmentName] = useState('');
  const [targetDomain, setTargetDomain] = useState('');

  useEffect(() => {
    api.getOrganizations().then(setOrganizations).catch(console.error);
  }, []);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  const handleNext = async () => {
    if (currentStep === 1) {
      // If creating new org
      if (!selectedOrgId && newOrgName && newOrgDomain) {
        setLoading(true);
        try {
          const org = await api.createOrganization({
            name: newOrgName,
            domain: newOrgDomain,
          });
          setOrganizations([...organizations, org]);
          setSelectedOrgId(org.id);
          setTargetDomain(newOrgDomain);
          setCurrentStep(2);
        } catch (error: any) {
          toast({
            title: 'Failed to create organization',
            description: error.message,
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
        return;
      }
      if (!selectedOrgId) {
        toast({
          title: 'Select an organization',
          description: 'Please select an existing organization or create a new one',
          variant: 'destructive',
        });
        return;
      }
      setTargetDomain(selectedOrg?.domain || '');
    }
    
    if (currentStep === 2 && !assessmentName) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the assessment',
        variant: 'destructive',
      });
      return;
    }

    if (currentStep === 3 && !targetDomain) {
      toast({
        title: 'Domain required',
        description: 'Please enter a target domain',
        variant: 'destructive',
      });
      return;
    }

    if (currentStep === 4) {
      // Create assessment
      setLoading(true);
      try {
        const assessment = await api.createAssessment({
          name: assessmentName,
          organizationId: selectedOrgId,
        });
        toast({
          title: 'Assessment created',
          description: 'Your assessment has been created successfully',
        });
        router.push(`/dashboard/assessments/${assessment.id}`);
      } catch (error: any) {
        toast({
          title: 'Failed to create assessment',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Assessment</h1>
        <p className="text-muted-foreground">
          Set up a new security posture assessment
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step.id < currentStep
                      ? 'bg-blue-600 text-white'
                      : step.id === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className="text-sm font-medium">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    step.id < currentStep
                      ? 'bg-blue-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Step Content */}
      <Card>
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle>Select Organization</CardTitle>
              <CardDescription>
                Choose an existing organization or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Organizations */}
              {organizations.length > 0 && (
                <div className="space-y-3">
                  <Label>Existing Organizations</Label>
                  <div className="grid gap-3">
                    {organizations.map((org) => (
                      <div
                        key={org.id}
                        onClick={() => {
                          setSelectedOrgId(org.id);
                          setNewOrgName('');
                          setNewOrgDomain('');
                        }}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedOrgId === org.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.domain}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Or create new */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or create new
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="Calo"
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      setSelectedOrgId('');
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgDomain">Primary Domain</Label>
                  <Input
                    id="orgDomain"
                    placeholder="calo.app"
                    value={newOrgDomain}
                    onChange={(e) => {
                      setNewOrgDomain(e.target.value);
                      setSelectedOrgId('');
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>
                Give your assessment a descriptive name
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assessmentName">Assessment Name</Label>
                <Input
                  id="assessmentName"
                  placeholder="Q1 2024 Security Posture Assessment"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                />
              </div>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium">Selected Organization</p>
                <p className="text-muted-foreground">{selectedOrg?.name}</p>
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 3 && (
          <>
            <CardHeader>
              <CardTitle>Target Scope</CardTitle>
              <CardDescription>
                Define the domains to assess (must match organization&apos;s approved domains)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetDomain">Primary Target Domain</Label>
                <Input
                  id="targetDomain"
                  placeholder="example.com"
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value)}
                />
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Safety Constraints
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                  <li>• All scans are rate-limited to 1 request/second</li>
                  <li>• No brute force, fuzzing, or credential stuffing</li>
                  <li>• Only approved domains can be scanned</li>
                  <li>• Maximum 50 requests per tool run</li>
                </ul>
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 4 && (
          <>
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>
                Confirm your assessment configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium">{selectedOrg?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Assessment Name</span>
                  <span className="font-medium">{assessmentName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Target Domain</span>
                  <span className="font-medium">{targetDomain}</span>
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Ready to start! After creating the assessment, you can run security tools
                  and add observations, risks, and action items.
                </p>
              </div>
            </CardContent>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between p-6 pt-0">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : currentStep === 4 ? (
              'Create Assessment'
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
