const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      response.statusText,
      error.message || 'An error occurred'
    );
  }
  return response.json();
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ access_token: string; user: any }>(response);
  },

  async register(data: { email: string; password: string; name: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ access_token: string; user: any }>(response);
  },

  async me() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<any>(response);
  },

  // Organizations
  async getOrganizations() {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<any[]>(response);
  },

  async createOrganization(data: { name: string; domain: string }) {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  async getOrganization(id: string) {
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<any>(response);
  },

  // Assessments
  async getAssessments(orgId?: string) {
    const url = orgId
      ? `${API_BASE_URL}/assessments?organizationId=${orgId}`
      : `${API_BASE_URL}/assessments`;
    const response = await fetch(url, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<any[]>(response);
  },

  async createAssessment(data: { name: string; organizationId: string }) {
    const response = await fetch(`${API_BASE_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  async getAssessment(id: string) {
    const response = await fetch(`${API_BASE_URL}/assessments/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<any>(response);
  },

  async updateAssessmentStatus(id: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/assessments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status }),
    });
    return handleResponse<any>(response);
  },

  // Assets
  async getAssets(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/assets?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },

  async createAsset(data: {
    assessmentId: string;
    type: string;
    value: string;
    label?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  // Observations
  async getObservations(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/observations?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },

  async createObservation(data: {
    assessmentId: string;
    title: string;
    description: string;
    severity: string;
    category: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  // Risks
  async getRisks(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/risks?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },

  async createRisk(data: {
    assessmentId: string;
    title: string;
    description: string;
    severity: string;
    likelihood: string;
    impact: string;
    rank: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  // Actions
  async getActions(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/actions?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },

  async createAction(data: {
    assessmentId: string;
    title: string;
    description: string;
    priority: string;
    phase: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  // Evidence
  async uploadEvidence(
    observationId: string,
    file: File,
    description?: string
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);

    const response = await fetch(
      `${API_BASE_URL}/evidence?observationId=${observationId}`,
      {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      }
    );
    return handleResponse<any>(response);
  },

  // Tool Runs
  async runTool(data: {
    assessmentId: string;
    toolName: string;
    target: string;
    parameters?: Record<string, any>;
  }) {
    const response = await fetch(`${API_BASE_URL}/tool-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
  },

  async getToolRuns(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/tool-runs?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },

  // Reports
  async generateReport(
    assessmentId: string,
    format: 'markdown' | 'html' | 'json'
  ) {
    const response = await fetch(
      `${API_BASE_URL}/reports/generate?assessmentId=${assessmentId}&format=${format}`,
      {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      }
    );
    return handleResponse<any>(response);
  },

  async getReports(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/reports?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },

  // Audit Controls
  async getAuditControls(assessmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/audit-controls?assessmentId=${assessmentId}`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse<any[]>(response);
  },
};

export { ApiError };
