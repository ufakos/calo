import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    throw error;
  }
);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    instance.post('/auth/login', { email, password }).then(r => r.data),

  register: (data: { email: string; password: string; name: string }) =>
    instance.post('/auth/register', data).then(r => r.data),

  me: () => instance.get('/auth/profile').then(r => r.data),

  // Organizations
  getOrganizations: () => instance.get('/organizations').then(r => r.data.organizations),

  createOrganization: (data: { name: string; domain: string; notes?: string }) =>
    instance.post('/organizations', data).then(r => r.data),

  updateOrganization: (
    id: string,
    data: { name?: string; domain?: string; notes?: string }
  ) => instance.patch(`/organizations/${id}`, data).then(r => r.data),

  deleteOrganization: (id: string) =>
    instance.delete(`/organizations/${id}`).then(r => r.data),

  getOrganization: (id: string) => instance.get(`/organizations/${id}`).then(r => r.data),

  // Assessments
  getAssessments: (orgId?: string) =>
    instance.get('/assessments', { params: { organizationId: orgId } }).then(r => r.data.assessments),

  createAssessment: (data: { organizationId: string; title?: string; scopeJson?: any }) =>
    instance.post('/assessments', data).then(r => r.data),

  updateAssessment: (
    id: string,
    data: { name?: string; title?: string; status?: string; scopeJson?: any }
  ) => instance.patch(`/assessments/${id}`, data).then(r => r.data),

  deleteAssessment: (id: string) =>
    instance.delete(`/assessments/${id}`).then(r => r.data),

  getAssessment: (id: string) => instance.get(`/assessments/${id}`).then(r => r.data),

  // Assets
  getAssets: (assessmentId: string) =>
    instance.get('/assets', { params: { assessmentId } }).then(r => r.data),

  createAsset: (data: {
    assessmentId: string;
    type: string;
    value: string;
    displayName?: string;
    notes?: string;
  }) => instance.post('/assets', data).then(r => r.data),

  updateAsset: (
    id: string,
    data: { displayName?: string; notes?: string; evidenceRefs?: string[] }
  ) => instance.patch(`/assets/${id}`, data).then(r => r.data),

  deleteAsset: (id: string) => instance.delete(`/assets/${id}`).then(r => r.data),

  // Observations
  getObservations: (assessmentId: string) =>
    instance.get('/observations', { params: { assessmentId } }).then(r => r.data),

  createObservation: (data: {
    assessmentId: string;
    category: string;
    title: string;
    summary: string;
    severity?: string;
    analystNotes?: string;
    evidenceRefs?: string[];
  }) => instance.post('/observations', data).then(r => r.data),

  updateObservation: (
    id: string,
    data: {
      category?: string;
      title?: string;
      summary?: string;
      severity?: string;
      analystNotes?: string;
      evidenceRefs?: string[];
    }
  ) => instance.patch(`/observations/${id}`, data).then(r => r.data),

  deleteObservation: (id: string) => instance.delete(`/observations/${id}`).then(r => r.data),

  // Risks
  getRisks: (assessmentId: string) =>
    instance.get('/risks', { params: { assessmentId } }).then(r => r.data),

  createRisk: (data: {
    assessmentId: string;
    rank: number;
    title: string;
    impact?: string;
    likelihood?: string;
    blastRadius?: string;
    easeToFix?: string;
    rationale?: string;
  }) => instance.post('/risks', data).then(r => r.data),

  deleteRisk: (id: string) => instance.delete(`/risks/${id}`).then(r => r.data),

  // Action items
  getActionItems: (assessmentId: string) =>
    instance.get('/action-items', { params: { assessmentId } }).then(r => r.data),

  createActionItem: (data: {
    assessmentId: string;
    phase: string;
    ownerType: string;
    priority?: string;
    title: string;
    description?: string;
    successMetric?: string;
  }) => instance.post('/action-items', data).then(r => r.data),

  deleteActionItem: (id: string) => instance.delete(`/action-items/${id}`).then(r => r.data),

  // Audit controls
  getAuditControls: (assessmentId: string) =>
    instance.get('/audit-controls', { params: { assessmentId } }).then(r => r.data),

  createAuditControl: (data: {
    assessmentId: string;
    title: string;
    description?: string;
    evidenceGenerated?: string;
    frequency?: string;
    automated?: boolean;
  }) => instance.post('/audit-controls', data).then(r => r.data),

  deleteAuditControl: (id: string) => instance.delete(`/audit-controls/${id}`).then(r => r.data),

  // Reports
  generateReport: (data: { assessmentId: string; format: 'HTML' | 'MARKDOWN' | 'PDF' | 'JSON'; mode?: 'FULL' | 'EXECUTIVE' | 'TECHNICAL' | 'THREE_PAGE' }) =>
    instance.post('/reports/generate', data).then(r => r.data),

  getReports: (assessmentId: string) =>
    instance.get('/reports', { params: { assessmentId } }).then(r => r.data),

  getReportContent: (id: string) =>
    instance.get(`/reports/${id}/download`, { responseType: 'blob' }).then(r => r.data),

  // Evidence
  getEvidence: (assessmentId: string) =>
    instance.get('/evidence', { params: { assessmentId } }).then(r => r.data),

  uploadEvidence: (data: {
    assessmentId: string;
    type: string;
    file: File;
    title?: string;
    description?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('assessmentId', data.assessmentId);
    formData.append('type', data.type);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);

    return instance.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  createEvidenceSnippet: (data: {
    assessmentId: string;
    type: string;
    content: string;
    sourceUrl?: string;
    title?: string;
    description?: string;
  }) => instance.post('/evidence/snippet', data).then(r => r.data),

  deleteEvidence: (id: string) => instance.delete(`/evidence/${id}`).then(r => r.data),

  evidenceContentUrl: (id: string) => `${API_BASE_URL}/evidence/${id}/content`,

  getEvidenceContent: (id: string) =>
    instance.get(`/evidence/${id}/content`, { responseType: 'blob' }).then(r => r.data),
};

export default instance;
