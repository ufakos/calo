import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export default function AssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState('');

  const [assetType, setAssetType] = useState('DOMAIN');
  const [assetValue, setAssetValue] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetEditDisplayName, setAssetEditDisplayName] = useState('');
  const [assetEditNotes, setAssetEditNotes] = useState('');
  const [assetEditEvidenceIds, setAssetEditEvidenceIds] = useState<string[]>([]);

  const [obsCategory, setObsCategory] = useState('TLS');
  const [obsSeverity, setObsSeverity] = useState('INFO');
  const [obsTitle, setObsTitle] = useState('');
  const [obsSummary, setObsSummary] = useState('');
  const [obsNotes, setObsNotes] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
  const [obsEditCategory, setObsEditCategory] = useState('TLS');
  const [obsEditSeverity, setObsEditSeverity] = useState('INFO');
  const [obsEditTitle, setObsEditTitle] = useState('');
  const [obsEditSummary, setObsEditSummary] = useState('');
  const [obsEditNotes, setObsEditNotes] = useState('');
  const [obsEditEvidenceIds, setObsEditEvidenceIds] = useState<string[]>([]);

  const [riskRank, setRiskRank] = useState(1);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskImpact, setRiskImpact] = useState('MEDIUM');
  const [riskLikelihood, setRiskLikelihood] = useState('MEDIUM');
  const [riskRationale, setRiskRationale] = useState('');

  const [actionPhase, setActionPhase] = useState('PRE_ONBOARDING');
  const [actionOwner, setActionOwner] = useState('SECURITY');
  const [actionPriority, setActionPriority] = useState('MEDIUM');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const [controlTitle, setControlTitle] = useState('');
  const [controlDescription, setControlDescription] = useState('');
  const [controlEvidence, setControlEvidence] = useState('');
  const [controlFrequency, setControlFrequency] = useState('ON_DEMAND');
  const [controlAutomated, setControlAutomated] = useState(false);

  const [evidenceType, setEvidenceType] = useState('SCREENSHOT');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [snippetContent, setSnippetContent] = useState('');
  const [snippetSourceUrl, setSnippetSourceUrl] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState<string>('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportTitle, setReportTitle] = useState<string>('Assessment Report');

  const handleViewEvidence = async (id: string) => {
    try {
      const blob = await api.getEvidenceContent(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load evidence content');
    }
  };

  useEffect(() => {
    if (!reportHtml) {
      setReportTitle('Assessment Report');
      return;
    }
    const doc = new DOMParser().parseFromString(reportHtml, 'text/html');
    const title = doc.querySelector('title')?.textContent?.trim();
    setReportTitle(title || 'Assessment Report');
  }, [reportHtml]);

  const { data: assessment, isLoading, error: assessmentError } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => api.getAssessment(id as string),
    enabled: !!id,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', id],
    queryFn: () => api.getAssets(id as string),
    enabled: !!id,
  });

  const { data: observations = [] } = useQuery({
    queryKey: ['observations', id],
    queryFn: () => api.getObservations(id as string),
    enabled: !!id,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', id],
    queryFn: () => api.getRisks(id as string),
    enabled: !!id,
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ['action-items', id],
    queryFn: () => api.getActionItems(id as string),
    enabled: !!id,
  });

  const { data: auditControls = [] } = useQuery({
    queryKey: ['audit-controls', id],
    queryFn: () => api.getAuditControls(id as string),
    enabled: !!id,
  });

  const { data: evidenceItems = [] } = useQuery({
    queryKey: ['evidence', id],
    queryFn: () => api.getEvidence(id as string),
    enabled: !!id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => api.getReports(id as string),
    enabled: !!id,
  });

  const createAsset = useMutation({
    mutationFn: () =>
      api.createAsset({
        assessmentId: id as string,
        type: assetType,
        value: assetValue,
        notes: assetNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
      setAssetValue('');
      setAssetNotes('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to add asset');
    },
  });

  const deleteAsset = useMutation({
    mutationFn: (assetId: string) => api.deleteAsset(assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', id] }),
  });

  const updateAsset = useMutation({
    mutationFn: (payload: { id: string; displayName?: string; notes?: string; evidenceRefs?: string[] }) =>
      api.updateAsset(payload.id, {
        displayName: payload.displayName,
        notes: payload.notes,
        evidenceRefs: payload.evidenceRefs,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
      setEditingAssetId(null);
      setAssetEditDisplayName('');
      setAssetEditNotes('');
      setAssetEditEvidenceIds([]);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update asset');
    },
  });

  const createObservation = useMutation({
    mutationFn: () =>
      api.createObservation({
        assessmentId: id as string,
        category: obsCategory,
        severity: obsSeverity,
        title: obsTitle,
        summary: obsSummary,
        analystNotes: obsNotes || undefined,
        evidenceRefs: selectedEvidenceIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations', id] });
      setObsTitle('');
      setObsSummary('');
      setObsNotes('');
      setSelectedEvidenceIds([]);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to add observation');
    },
  });

  const deleteObservation = useMutation({
    mutationFn: (obsId: string) => api.deleteObservation(obsId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['observations', id] }),
  });

  const updateObservation = useMutation({
    mutationFn: (payload: {
      id: string;
      data: {
        category?: string;
        title?: string;
        summary?: string;
        severity?: string;
        analystNotes?: string;
        evidenceRefs?: string[];
      };
    }) => api.updateObservation(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations', id] });
      setEditingObservationId(null);
      setObsEditCategory('TLS');
      setObsEditSeverity('INFO');
      setObsEditTitle('');
      setObsEditSummary('');
      setObsEditNotes('');
      setObsEditEvidenceIds([]);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update observation');
    },
  });

  const createRisk = useMutation({
    mutationFn: () =>
      api.createRisk({
        assessmentId: id as string,
        rank: riskRank,
        title: riskTitle,
        impact: riskImpact,
        likelihood: riskLikelihood,
        rationale: riskRationale || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setRiskTitle('');
      setRiskRationale('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to add risk');
    },
  });

  const deleteRisk = useMutation({
    mutationFn: (riskId: string) => api.deleteRisk(riskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['risks', id] }),
  });

  const createActionItem = useMutation({
    mutationFn: () =>
      api.createActionItem({
        assessmentId: id as string,
        phase: actionPhase,
        ownerType: actionOwner,
        priority: actionPriority,
        title: actionTitle,
        description: actionDescription || undefined,
        successMetric: actionSuccess || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items', id] });
      setActionTitle('');
      setActionDescription('');
      setActionSuccess('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to add action item');
    },
  });

  const deleteActionItem = useMutation({
    mutationFn: (actionId: string) => api.deleteActionItem(actionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action-items', id] }),
  });

  const createAuditControl = useMutation({
    mutationFn: () =>
      api.createAuditControl({
        assessmentId: id as string,
        title: controlTitle,
        description: controlDescription || undefined,
        evidenceGenerated: controlEvidence || undefined,
        frequency: controlFrequency,
        automated: controlAutomated,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-controls', id] });
      setControlTitle('');
      setControlDescription('');
      setControlEvidence('');
      setControlAutomated(false);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to add audit control');
    },
  });

  const deleteAuditControl = useMutation({
    mutationFn: (controlId: string) => api.deleteAuditControl(controlId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit-controls', id] }),
  });

  const uploadEvidence = useMutation({
    mutationFn: () =>
      api.uploadEvidence({
        assessmentId: id as string,
        type: evidenceType,
        file: evidenceFile as File,
        title: evidenceTitle || undefined,
        description: evidenceDescription || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', id] });
      setEvidenceTitle('');
      setEvidenceDescription('');
      setEvidenceFile(null);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to upload evidence');
    },
  });

  const createSnippet = useMutation({
    mutationFn: () =>
      api.createEvidenceSnippet({
        assessmentId: id as string,
        type: evidenceType,
        content: snippetContent,
        sourceUrl: snippetSourceUrl || undefined,
        title: evidenceTitle || undefined,
        description: evidenceDescription || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', id] });
      setEvidenceTitle('');
      setEvidenceDescription('');
      setSnippetContent('');
      setSnippetSourceUrl('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create snippet');
    },
  });

  const deleteEvidence = useMutation({
    mutationFn: (evidenceId: string) => api.deleteEvidence(evidenceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence', id] }),
  });

  const generateReport = useMutation({
    mutationFn: (format: 'HTML' | 'MARKDOWN' | 'PDF' | 'JSON') =>
      api.generateReport({ assessmentId: id as string, format, mode: 'FULL' }),
    onSuccess: async (report: any) => {
      queryClient.invalidateQueries({ queryKey: ['reports', id] });
      if (report?.id) {
        setSelectedReportId(report.id);
        await handleLoadReport(report.id);
        if (id) {
          window.open(`/app/assessments/${id}/report`, '_blank', 'noopener,noreferrer');
        }
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to generate report');
    },
  });

  const handleLoadReport = async (reportId: string) => {
    try {
      setIsLoadingReport(true);
      const blob = await api.getReportContent(reportId);
      const html = await blob.text();
      setReportHtml(html);
      setSelectedReportId(reportId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleOpenReportTab = async (reportId: string) => {
    try {
      const blob = await api.getReportContent(reportId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open report');
    }
  };

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

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading assessment...</div>;
  }

  if (assessmentError || !assessment) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/app/assessments')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </button>
        <div className="mt-6 text-red-600">Failed to load assessment.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => navigate('/app/assessments')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Assessments
      </button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {assessment.name}
        </h1>
        <p className="text-slate-600 mt-1">
          {assessment.organization?.name || 'Unknown Organization'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Status</div>
          <div className="text-lg font-semibold text-slate-900">
            {assessment.status || 'DRAFT'}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Assets</div>
          <div className="text-lg font-semibold text-slate-900">
            {assessment._count?.assets ?? assets.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Risks</div>
          <div className="text-lg font-semibold text-slate-900">
            {assessment._count?.risks ?? risks.length}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Reports */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-600 mt-1">
          Generate a full detailed report including Attack Surface Map and Hands-on Observations with evidence.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateReport.mutate('HTML')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? 'Generating...' : 'Generate Full Report'}
          </button>
          <button
            onClick={() => selectedReportId && handleOpenReportTab(selectedReportId)}
            className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg text-sm"
            disabled={!selectedReportId}
          >
            Open Full Page
          </button>
          <button
            onClick={() => id && window.open(`/app/assessments/${id}/report`, '_blank', 'noopener,noreferrer')}
            className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm border border-slate-200"
          >
            Open Executive Summary
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
          >
            Export to PDF
          </button>
        </div>

        {reports.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-slate-700">Recent Reports</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {reports.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => handleLoadReport(r.id)}
                  className={`px-3 py-1.5 rounded text-xs border ${selectedReportId === r.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                  {r.format} • {new Date(r.generatedAt).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          {isLoadingReport ? (
            <div className="text-sm text-slate-500">Loading report...</div>
          ) : reportHtml ? (
            <iframe
              title="Assessment Report"
              srcDoc={reportHtml}
              className="w-full h-[720px] border border-slate-200 rounded-lg"
            />
          ) : (
            <div className="text-sm text-slate-500">No report loaded yet.</div>
          )}
        </div>

      </section>

      {/* 1) Attack surface map */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Attack Surface Map</h2>
        <p className="text-sm text-slate-600 mt-1">Domains, subdomains, APIs, public entry points.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="DOMAIN">Domain</option>
            <option value="SUBDOMAIN">Subdomain</option>
            <option value="URL">URL</option>
            <option value="API_HOST">API Host</option>
            <option value="THIRD_PARTY">Third Party</option>
            <option value="MOBILE_APP">Mobile App</option>
            <option value="IP_ADDRESS">IP Address</option>
          </select>
          <input
            value={assetValue}
            onChange={(e) => setAssetValue(e.target.value)}
            placeholder="e.g., api.calo.app"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            value={assetNotes}
            onChange={(e) => setAssetNotes(e.target.value)}
            placeholder="Notes"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => {
            if (!assetValue.trim()) {
              setError('Please enter an asset value.');
              return;
            }
            createAsset.mutate();
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          disabled={createAsset.isPending}
        >
          {createAsset.isPending ? 'Adding...' : 'Add Asset'}
        </button>

        <div className="mt-4 divide-y divide-slate-200">
          {assets.map((asset: any) => (
            <div key={asset.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {asset.type} • {asset.value}
                </div>
                {asset.notes && (
                  <div className="text-xs text-slate-500">{asset.notes}</div>
                )}
                {Array.isArray(asset.evidenceRefs) && asset.evidenceRefs.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Evidence:{' '}
                    {asset.evidenceRefs.map((eid: string, index: number) => {
                      const item = evidenceItems.find((e: any) => e.id === eid);
                      return (
                        <span key={eid}>
                          {index > 0 ? ', ' : ''}
                          {item ? (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleViewEvidence(eid);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {item.title || item.type}
                            </a>
                          ) : (
                            eid
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingAssetId(asset.id);
                    setAssetEditDisplayName(asset.displayName || asset.value || '');
                    setAssetEditNotes(asset.notes || '');
                    setAssetEditEvidenceIds(Array.isArray(asset.evidenceRefs) ? asset.evidenceRefs : []);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAsset.mutate(asset.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingAssetId && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-sm font-medium text-slate-800 mb-2">Edit Asset</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={assetEditDisplayName}
                onChange={(e) => setAssetEditDisplayName(e.target.value)}
                placeholder="Display name"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                value={assetEditNotes}
                onChange={(e) => setAssetEditNotes(e.target.value)}
                placeholder="Notes"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            {evidenceItems.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-slate-700">Attach evidence</div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {evidenceItems.map((item: any) => {
                    const checked = assetEditEvidenceIds.includes(item.id);
                    return (
                      <label key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssetEditEvidenceIds([...assetEditEvidenceIds, item.id]);
                            } else {
                              setAssetEditEvidenceIds(assetEditEvidenceIds.filter((id) => id !== item.id));
                            }
                          }}
                        />
                        {item.title || item.type}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  updateAsset.mutate({
                    id: editingAssetId,
                    displayName: assetEditDisplayName || undefined,
                    notes: assetEditNotes || undefined,
                    evidenceRefs: assetEditEvidenceIds,
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                disabled={updateAsset.isPending}
              >
                {updateAsset.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingAssetId(null);
                  setAssetEditDisplayName('');
                  setAssetEditNotes('');
                  setAssetEditEvidenceIds([]);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Evidence & Screenshots */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Evidence & Screenshots</h2>
        <p className="text-sm text-slate-600 mt-1">Upload screenshots or add text snippets for commands/results.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="SCREENSHOT">Screenshot</option>
            <option value="HEADER_SNIPPET">Header Snippet</option>
            <option value="TERMINAL_OUTPUT">Terminal Output</option>
            <option value="CODE_SNIPPET">Code Snippet</option>
            <option value="DOCUMENT">Document</option>
            <option value="LINK">Link</option>
            <option value="TOOL_OUTPUT">Tool Output</option>
          </select>
          <input
            value={evidenceTitle}
            onChange={(e) => setEvidenceTitle(e.target.value)}
            placeholder="Title"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            value={evidenceDescription}
            onChange={(e) => setEvidenceDescription(e.target.value)}
            placeholder="Description"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="file"
            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              if (!evidenceFile) {
                setError('Please choose a file to upload.');
                return;
              }
              uploadEvidence.mutate();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            disabled={uploadEvidence.isPending}
          >
            {uploadEvidence.isPending ? 'Uploading...' : 'Upload File'}
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Snippet (commands + results)</label>
          <textarea
            value={snippetContent}
            onChange={(e) => setSnippetContent(e.target.value)}
            placeholder="Paste command and output here..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            rows={3}
          />
          <input
            value={snippetSourceUrl}
            onChange={(e) => setSnippetSourceUrl(e.target.value)}
            placeholder="Source URL (optional)"
            className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            onClick={() => {
              if (!snippetContent.trim()) {
                setError('Please add snippet content.');
                return;
              }
              createSnippet.mutate();
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            disabled={createSnippet.isPending}
          >
            {createSnippet.isPending ? 'Saving...' : 'Add Snippet'}
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-200">
          {evidenceItems.map((item: any) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {item.type} • {item.title || 'Untitled'}
                </div>
                {item.description && (
                  <div className="text-xs text-slate-500">{item.description}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleViewEvidence(item.id);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  View
                </a>
                <button
                  onClick={() => deleteEvidence.mutate(item.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2) Hands-on observations */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Hands-on Observations</h2>
        <p className="text-sm text-slate-600 mt-1">TLS, headers, CORS, auth flows, rate limits, errors.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={obsCategory}
            onChange={(e) => setObsCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="TLS">TLS</option>
            <option value="HEADERS">Headers</option>
            <option value="CORS">CORS</option>
            <option value="AUTH">Auth</option>
            <option value="ERRORS">Errors</option>
            <option value="RATELIMIT">Rate Limit</option>
            <option value="MOBILE">Mobile</option>
            <option value="API">API</option>
            <option value="INFRASTRUCTURE">Infrastructure</option>
            <option value="THIRD_PARTY">Third Party</option>
            <option value="OTHER">Other</option>
          </select>
          <select
            value={obsSeverity}
            onChange={(e) => setObsSeverity(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="INFO">Info</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <input
            value={obsTitle}
            onChange={(e) => setObsTitle(e.target.value)}
            placeholder="Title"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            value={obsSummary}
            onChange={(e) => setObsSummary(e.target.value)}
            placeholder="Summary"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <textarea
          value={obsNotes}
          onChange={(e) => setObsNotes(e.target.value)}
          placeholder="Notes / risk rating justification"
          className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          rows={2}
        />

        {evidenceItems.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-slate-700">Attach evidence</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {evidenceItems.map((item: any) => {
                const checked = selectedEvidenceIds.includes(item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEvidenceIds([...selectedEvidenceIds, item.id]);
                        } else {
                          setSelectedEvidenceIds(selectedEvidenceIds.filter((id) => id !== item.id));
                        }
                      }}
                    />
                    {item.title || item.type}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            if (!obsTitle.trim() || !obsSummary.trim()) {
              setError('Please enter a title and summary for the observation.');
              return;
            }
            createObservation.mutate();
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          disabled={createObservation.isPending}
        >
          {createObservation.isPending ? 'Adding...' : 'Add Observation'}
        </button>

        <div className="mt-4 divide-y divide-slate-200">
          {observations.map((obs: any) => (
            <div key={obs.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {obs.category} • {obs.title} • {obs.severity || 'INFO'}
                </div>
                <div className="text-xs text-slate-500">{obs.summary}</div>
                {obs.analystNotes && (
                  <div className="text-xs text-slate-500 mt-1">Notes: {obs.analystNotes}</div>
                )}
                {Array.isArray(obs.evidenceRefs) && obs.evidenceRefs.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Evidence:{' '}
                    {obs.evidenceRefs.map((eid: string, index: number) => {
                      const item = evidenceItems.find((e: any) => e.id === eid);
                      return (
                        <span key={eid}>
                          {index > 0 ? ', ' : ''}
                          {item ? (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleViewEvidence(eid);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {item.title || item.type}
                            </a>
                          ) : (
                            eid
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingObservationId(obs.id);
                    setObsEditCategory(obs.category || 'TLS');
                    setObsEditSeverity(obs.severity || 'INFO');
                    setObsEditTitle(obs.title || '');
                    setObsEditSummary(obs.summary || '');
                    setObsEditNotes(obs.analystNotes || '');
                    setObsEditEvidenceIds(Array.isArray(obs.evidenceRefs) ? obs.evidenceRefs : []);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteObservation.mutate(obs.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingObservationId && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-sm font-medium text-slate-800 mb-2">Edit Observation</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={obsEditCategory}
                onChange={(e) => setObsEditCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="TLS">TLS</option>
                <option value="HEADERS">Headers</option>
                <option value="CORS">CORS</option>
                <option value="AUTH">Auth</option>
                <option value="ERRORS">Errors</option>
                <option value="RATELIMIT">Rate Limit</option>
                <option value="MOBILE">Mobile</option>
                <option value="API">API</option>
                <option value="INFRASTRUCTURE">Infrastructure</option>
                <option value="THIRD_PARTY">Third Party</option>
                <option value="OTHER">Other</option>
              </select>
              <select
                value={obsEditSeverity}
                onChange={(e) => setObsEditSeverity(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="INFO">Info</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <input
                value={obsEditTitle}
                onChange={(e) => setObsEditTitle(e.target.value)}
                placeholder="Title"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                value={obsEditSummary}
                onChange={(e) => setObsEditSummary(e.target.value)}
                placeholder="Summary"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <textarea
              value={obsEditNotes}
              onChange={(e) => setObsEditNotes(e.target.value)}
              placeholder="Notes / risk rating justification"
              className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={2}
            />

            {evidenceItems.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-slate-700">Attach evidence</div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {evidenceItems.map((item: any) => {
                    const checked = obsEditEvidenceIds.includes(item.id);
                    return (
                      <label key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setObsEditEvidenceIds([...obsEditEvidenceIds, item.id]);
                            } else {
                              setObsEditEvidenceIds(obsEditEvidenceIds.filter((id) => id !== item.id));
                            }
                          }}
                        />
                        {item.title || item.type}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  updateObservation.mutate({
                    id: editingObservationId,
                    data: {
                      category: obsEditCategory,
                      severity: obsEditSeverity,
                      title: obsEditTitle,
                      summary: obsEditSummary,
                      analystNotes: obsEditNotes || undefined,
                      evidenceRefs: obsEditEvidenceIds,
                    },
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                disabled={updateObservation.isPending}
              >
                {updateObservation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingObservationId(null);
                  setObsEditCategory('TLS');
                  setObsEditSeverity('INFO');
                  setObsEditTitle('');
                  setObsEditSummary('');
                  setObsEditNotes('');
                  setObsEditEvidenceIds([]);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3) Top risks */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Top 5 Risks</h2>
        <p className="text-sm text-slate-600 mt-1">Ranked by impact, likelihood, blast radius, ease to fix.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="number"
            min={1}
            max={5}
            value={riskRank}
            onChange={(e) => setRiskRank(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Rank 1-5"
          />
          <input
            value={riskTitle}
            onChange={(e) => setRiskTitle(e.target.value)}
            placeholder="Title"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={riskImpact}
            onChange={(e) => setRiskImpact(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select
            value={riskLikelihood}
            onChange={(e) => setRiskLikelihood(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <input
            value={riskRationale}
            onChange={(e) => setRiskRationale(e.target.value)}
            placeholder="Rationale"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => {
            if (!riskTitle.trim()) {
              setError('Please enter a risk title.');
              return;
            }
            createRisk.mutate();
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          disabled={createRisk.isPending}
        >
          {createRisk.isPending ? 'Adding...' : 'Add Risk'}
        </button>

        <div className="mt-4 divide-y divide-slate-200">
          {risks.map((risk: any) => (
            <div key={risk.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  #{risk.rank} • {risk.title}
                </div>
                <div className="text-xs text-slate-500">
                  Impact {risk.impact || 'MEDIUM'} • Likelihood {risk.likelihood || 'MEDIUM'}
                </div>
              </div>
              <button
                onClick={() => deleteRisk.mutate(risk.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4) Action plan */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Action Plan That Ships</h2>
        <p className="text-sm text-slate-600 mt-1">Pre‑onboarding and first 2 weeks (owners and success metrics).</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={actionPhase}
            onChange={(e) => setActionPhase(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="PRE_ONBOARDING">Pre‑onboarding</option>
            <option value="FIRST_2_WEEKS">First 2 weeks</option>
            <option value="MONTH_1">Month 1</option>
            <option value="QUARTER_1">Quarter 1</option>
          </select>
          <select
            value={actionOwner}
            onChange={(e) => setActionOwner(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="PLATFORM">Platform</option>
            <option value="PRODUCT">Product</option>
            <option value="SECURITY">Security</option>
            <option value="ENGINEERING">Engineering</option>
            <option value="DEVOPS">DevOps</option>
          </select>
          <select
            value={actionPriority}
            onChange={(e) => setActionPriority(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <input
            value={actionTitle}
            onChange={(e) => setActionTitle(e.target.value)}
            placeholder="Action title"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            value={actionSuccess}
            onChange={(e) => setActionSuccess(e.target.value)}
            placeholder="Success metric"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <textarea
          value={actionDescription}
          onChange={(e) => setActionDescription(e.target.value)}
          placeholder="Description"
          className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          rows={2}
        />
        <button
          onClick={() => {
            if (!actionTitle.trim()) {
              setError('Please enter an action title.');
              return;
            }
            createActionItem.mutate();
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          disabled={createActionItem.isPending}
        >
          {createActionItem.isPending ? 'Adding...' : 'Add Action'}
        </button>

        <div className="mt-4 divide-y divide-slate-200">
          {actionItems.map((action: any) => (
            <div key={action.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {action.title}
                </div>
                <div className="text-xs text-slate-500">
                  {action.phase} • {action.ownerType} • {action.priority}
                </div>
              </div>
              <button
                onClick={() => deleteActionItem.mutate(action.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5) Audit readiness */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Audit Readiness</h2>
        <p className="text-sm text-slate-600 mt-1">Controls to automate and evidence produced.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={controlTitle}
            onChange={(e) => setControlTitle(e.target.value)}
            placeholder="Control title"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            value={controlEvidence}
            onChange={(e) => setControlEvidence(e.target.value)}
            placeholder="Evidence generated"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={controlFrequency}
            onChange={(e) => setControlFrequency(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="CONTINUOUS">Continuous</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUALLY">Annually</option>
            <option value="ON_DEMAND">On demand</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={controlAutomated}
              onChange={(e) => setControlAutomated(e.target.checked)}
            />
            Automated
          </label>
        </div>
        <textarea
          value={controlDescription}
          onChange={(e) => setControlDescription(e.target.value)}
          placeholder="Description"
          className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          rows={2}
        />
        <button
          onClick={() => {
            if (!controlTitle.trim()) {
              setError('Please enter a control title.');
              return;
            }
            createAuditControl.mutate();
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          disabled={createAuditControl.isPending}
        >
          {createAuditControl.isPending ? 'Adding...' : 'Add Audit Control'}
        </button>

        <div className="mt-4 divide-y divide-slate-200">
          {auditControls.map((control: any) => (
            <div key={control.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {control.title}
                </div>
                <div className="text-xs text-slate-500">
                  {control.frequency} • {control.automated ? 'Automated' : 'Manual'}
                </div>
              </div>
              <button
                onClick={() => deleteAuditControl.mutate(control.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
