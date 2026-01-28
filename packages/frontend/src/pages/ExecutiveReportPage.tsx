import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export default function ExecutiveReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState('');
  const [reportHtml, setReportHtml] = useState('');
  const [reportTitle, setReportTitle] = useState('Executive Summary');
  const [isLoading, setIsLoading] = useState(false);

  const loadLatestReport = async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const reports = await api.getReports(id);
      const match = (reports || []).find((r: any) => r.mode === 'THREE_PAGE' && r.format === 'HTML');
      if (match?.id) {
        const blob = await api.getReportContent(match.id);
        const html = await blob.text();
        setReportHtml(html);
        return;
      }

      const generated = await api.generateReport({
        assessmentId: id,
        format: 'HTML',
        mode: 'THREE_PAGE',
      });
      if (generated?.id) {
        queryClient.invalidateQueries({ queryKey: ['reports', id] });
        const blob = await api.getReportContent(generated.id);
        const html = await blob.text();
        setReportHtml(html);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLatestReport();
  }, [id]);

  useEffect(() => {
    if (!reportHtml) return;
    const doc = new DOMParser().parseFromString(reportHtml, 'text/html');
    const title = doc.querySelector('title')?.textContent?.trim();
    setReportTitle(title || 'Executive Summary');
  }, [reportHtml]);

  const handleExportPdf = () => {
    if (!reportHtml) {
      setError('Please generate a report first.');
      return;
    }
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      setError('Popup blocked. Please allow popups to export PDF.');
      return;
    }
    win.document.open();
    win.document.write(reportHtml);
    win.document.close();
    win.document.title = reportTitle;
    win.focus();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/app/assessments/${id}`)}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessment
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLatestReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Regenerate Report'}
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
          >
            Export to PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading executive summary...</div>
      ) : reportHtml ? (
        <iframe
          title="Executive Summary Report"
          srcDoc={reportHtml}
          className="w-full h-[85vh] border border-slate-200 rounded-lg bg-white"
        />
      ) : (
        <div className="text-sm text-slate-500">No report available.</div>
      )}
    </div>
  );
}
