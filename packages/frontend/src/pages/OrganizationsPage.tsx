import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, X } from 'lucide-react';

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.getOrganizations(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setShowForm(false);
      setFormData({ name: '', domain: '', notes: '' });
      setEditingOrgId(null);
      setError('');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Failed to create organization'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: { name?: string; domain?: string; notes?: string } }) =>
      api.updateOrganization(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setShowForm(false);
      setFormData({ name: '', domain: '', notes: '' });
      setEditingOrgId(null);
      setError('');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Failed to update organization'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setError('');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Failed to delete organization'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.domain) {
      setError('Please fill in all required fields');
      return;
    }

    const payload = {
      name: formData.name,
      domain: formData.domain,
      notes: formData.notes || undefined,
    };

    if (editingOrgId) {
      updateMutation.mutate({ id: editingOrgId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Organizations</h1>
          <p className="text-slate-600 mt-1">
            Manage organizations and conduct assessments
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingOrgId(null);
              setFormData({ name: '', domain: '', notes: '' });
              setError('');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Organization
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Create Organization
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setError('');
                setFormData({ name: '', domain: '', notes: '' });
                setEditingOrgId(null);
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
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
                value={formData.domain}
                onChange={(e) =>
                  setFormData({ ...formData, domain: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., acme.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending
                  ? 'Updating...'
                  : createMutation.isPending
                  ? 'Creating...'
                  : editingOrgId
                  ? 'Update Organization'
                  : 'Create Organization'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                  setFormData({ name: '', domain: '', notes: '' });
                  setEditingOrgId(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          Loading organizations...
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-600 mb-4">No organizations found</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create First Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org: any) => (
            <div
              key={org.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 transition-colors cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {org.name}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{org.domain}</p>
              {org.notes && (
                <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                  {org.notes}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Assessments: {org._count?.assessments || 0}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingOrgId(org.id);
                      setFormData({
                        name: org.name || '',
                        domain: org.domain || '',
                        notes: org.notes || '',
                      });
                      setShowForm(true);
                      setError('');
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (org._count?.assessments > 0) {
                        setError('Cannot delete an organization with assessments');
                        return;
                      }
                      const confirmed = window.confirm(
                        `Delete organization "${org.name}"? This cannot be undone.`
                      );
                      if (confirmed) {
                        deleteMutation.mutate(org.id);
                      }
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
