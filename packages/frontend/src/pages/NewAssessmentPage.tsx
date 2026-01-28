import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react';

type Step = 'organization' | 'details' | 'scope' | 'review';

interface FormData {
  organizationId: string;
  organizationName: string;
  organizationDomain: string;
  name: string;
  description: string;
  scope: string;
}

export default function NewAssessmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('organization');
  const [formData, setFormData] = useState<FormData>({
    organizationId: '',
    organizationName: '',
    organizationDomain: '',
    name: '',
    description: '',
    scope: '',
  });
  const [createOrgForm, setCreateOrgForm] = useState(false);
  const [error, setError] = useState('');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.getOrganizations(),
  });

  const createOrgMutation = useMutation({
    mutationFn: (data) => api.createOrganization(data),
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setFormData({
        ...formData,
        organizationId: newOrg.id,
        organizationName: newOrg.name,
        organizationDomain: newOrg.domain,
      });
      setCreateOrgForm(false);
      setError('');
      setStep('details');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Failed to create organization'
      );
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: (data) =>
      api.createAssessment({
        organizationId: data.organizationId,
        title: data.name,
        scopeJson: { domain: data.scope },
      }),
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      navigate(`/app/assessments/${assessment.id}`);
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Failed to create assessment'
      );
    },
  });

  const handleCreateOrg = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.organizationName || !formData.organizationDomain) {
      setError('Please fill in all required fields');
      return;
    }

    createOrgMutation.mutate({
      name: formData.organizationName,
      domain: formData.organizationDomain,
    });
  };

  const handleNext = () => {
    setError('');

    if (step === 'organization' && !formData.organizationId) {
      setError('Please select an organization');
      return;
    }

    if (step === 'details') {
      if (!formData.name) {
        setError('Please enter an assessment name');
        return;
      }
      setStep('scope');
    } else if (step === 'scope') {
      if (!formData.scope) {
        setError('Please define the assessment scope');
        return;
      }
      setStep('review');
    } else if (step === 'organization') {
      setStep('details');
    }
  };

  const handlePrev = () => {
    const steps: Step[] = ['organization', 'details', 'scope', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
    setError('');
  };

  const handleSubmit = () => {
    setError('');

    if (!formData.organizationId || !formData.name || !formData.scope) {
      setError('Please complete all required fields');
      return;
    }

    createAssessmentMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          New Assessment
        </h1>
        <p className="text-slate-600 mt-2">
          Create a new security posture assessment
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {(['organization', 'details', 'scope', 'review'] as Step[]).map(
            (s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : ['organization', 'details', 'scope', 'review'].indexOf(
                            step
                          ) > i
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      ['organization', 'details', 'scope', 'review'].indexOf(
                        step
                      ) > i
                        ? 'bg-green-600'
                        : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          )}
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Organization</span>
          <span>Details</span>
          <span>Scope</span>
          <span>Review</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        {/* Step 1: Organization */}
        {step === 'organization' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Select Organization
              </h2>

              {createOrgForm ? (
                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizationName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Acme Corporation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      Domain *
                    </label>
                    <input
                      type="text"
                      value={formData.organizationDomain}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizationDomain: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., acme.com"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={createOrgMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {createOrgMutation.isPending
                        ? 'Creating...'
                        : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateOrgForm(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {organizations.map((org: any) => (
                      <label
                        key={org.id}
                        className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <input
                          type="radio"
                          name="organization"
                          value={org.id}
                          checked={formData.organizationId === org.id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organizationId: e.target.value,
                              organizationName: org.name,
                              organizationDomain: org.domain,
                            })
                          }
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-slate-900">
                            {org.name}
                          </p>
                          <p className="text-sm text-slate-500">{org.domain}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreateOrgForm(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Organization
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Assessment Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Organization
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                {formData.organizationName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Assessment Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Q4 2024 Security Assessment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description of the assessment"
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 3: Scope */}
        {step === 'scope' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Assessment Scope
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Define Assessment Scope *
              </label>
              <textarea
                value={formData.scope}
                onChange={(e) =>
                  setFormData({ ...formData, scope: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the scope of this assessment (e.g., domains, IP ranges, services to be assessed)"
                rows={6}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Review & Create
            </h2>

            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-sm text-slate-600">Organization</p>
                <p className="text-lg font-medium text-slate-900">
                  {formData.organizationName}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Assessment Name</p>
                <p className="text-lg font-medium text-slate-900">
                  {formData.name}
                </p>
              </div>

              {formData.description && (
                <div>
                  <p className="text-sm text-slate-600">Description</p>
                  <p className="text-slate-900">{formData.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-600">Scope</p>
                <p className="text-slate-900 whitespace-pre-wrap">
                  {formData.scope}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handlePrev}
          disabled={step === 'organization'}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {step === 'review' ? (
          <button
            onClick={handleSubmit}
            disabled={createAssessmentMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createAssessmentMutation.isPending
              ? 'Creating...'
              : 'Create Assessment'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
