import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.getAssessments(),
  });

  const stats = [
    {
      label: 'Total Assessments',
      value: assessments.length,
      icon: Activity,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'In Progress',
      value: assessments.filter((a: any) => a.status === 'IN_PROGRESS').length,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Completed',
      value: assessments.filter((a: any) => a.status === 'COMPLETED').length,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Critical Risks',
      value: assessments.reduce((sum: number, a: any) => {
        return sum + (a.risks?.filter((r: any) => r.impact === 'CRITICAL').length || 0);
      }, 0),
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Overview of your security assessments and posture
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Assessments */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Assessments
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {isLoading ? (
            <div className="px-6 py-8 text-center text-slate-500">
              Loading assessments...
            </div>
          ) : assessments.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              No assessments found. Create one to get started.
            </div>
          ) : (
            assessments.slice(0, 5).map((assessment: any) => (
              <div
                key={assessment.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/assessments/${assessment.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {assessment.name}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {assessment.organization?.name || 'Unknown Organization'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      assessment.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : assessment.status === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {assessment.status || 'DRAFT'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
