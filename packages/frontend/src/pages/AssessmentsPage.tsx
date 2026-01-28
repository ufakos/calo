import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [error, setError] = useState('');

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.getAssessments(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.getOrganizations(),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: { name?: string; status?: string } }) =>
      api.updateAssessment(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setEditingAssessmentId(null);
      setEditName('');
      setEditStatus('DRAFT');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update assessment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to delete assessment');
    },
  });

  const filteredAssessments = assessments.filter(
    (a: any) => filter === 'ALL' || a.status === filter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assessments</h1>
          <p className="text-slate-600 mt-1">
            Manage and view all security assessments
          </p>
        </div>
        <button
          onClick={() => navigate('/app/assessments/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Assessment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { label: 'All', value: 'ALL' },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          { label: 'Completed', value: 'COMPLETED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === tab.value
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assessments List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          Loading assessments...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-600 mb-4">No assessments found</p>
          <button
            onClick={() => navigate('/app/assessments/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create First Assessment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="divide-y divide-slate-200">
            {filteredAssessments.map((assessment: any) => {
              const org = organizations.find(
                (o: any) => o.id === assessment.organizationId
              );
              return (
                <div
                  key={assessment.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/app/assessments/${assessment.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(assessment.status)}
                        <div>
                          <p className="font-medium text-slate-900">
                            {assessment.name}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            {org?.name || 'Unknown Organization'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          {assessment._count?.assets || 0} Assets
                        </p>
                        <p className="text-sm text-slate-600">
                          {assessment._count?.risks || 0} Risks
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                          assessment.status
                        )}`}
                      >
                        {assessment.status || 'DRAFT'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAssessmentId(assessment.id);
                            setEditName(assessment.name || '');
                            setEditStatus(assessment.status || 'DRAFT');
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
                            const confirmed = window.confirm(
                              `Delete assessment "${assessment.name}"? This cannot be undone.`
                            );
                            if (confirmed) {
                              deleteMutation.mutate(assessment.id);
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

                  {editingAssessmentId === assessment.id && (
                    <div
                      className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Status
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateMutation.mutate({
                                id: assessment.id,
                                data: {
                                  name: editName.trim() || assessment.name,
                                  status: editStatus,
                                },
                              });
                            }}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAssessmentId(null);
                              setEditName('');
                              setEditStatus('DRAFT');
                            }}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-200 text-slate-900 hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
