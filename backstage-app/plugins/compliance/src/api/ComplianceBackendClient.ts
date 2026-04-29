/**
 * Frontend API client that talks to the compliance backend REST API.
 *
 * All data flows through the backend — the frontend never decides
 * mock vs live. The backend's ComplianceService handles the toggle.
 */
import type {
  ComplianceProfile,
  MultiHostFinding,
  DashboardStats,
  LaunchScanRequest,
  LaunchScanResponse,
  LaunchRemediationRequest,
  LaunchRemediationResponse,
  PostureSnapshot,
  RemediationProfile,
  SaveRemediationProfileRequest,
  WorkflowJobStatus,
  WorkflowNode,
  JobEvent,
} from '@aap-compliance/common';

const BACKEND_BASE = '/api/compliance';

async function request<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const url = `${BACKEND_BASE}${path}`;
  const resp = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${errBody}`);
  }

  return (await resp.json()) as T;
}

// ─── Public API ─────────────────────────────────────────────────────

export const complianceApi = {
  /** Check backend health and current data source mode. */
  getHealth: () => request<{ status: string; dataSource: string }>('/health'),

  /** List compliance profiles (STIG, CIS, PCI-DSS, etc.). */
  getProfiles: () => request<ComplianceProfile[]>('/profiles'),

  /** List Controller inventories. */
  getInventories: () =>
    request<Array<{ id: number; name: string; hostCount: number }>>('/inventories'),

  /** List compliance workflow templates. */
  getWorkflowTemplates: (nameFilter?: string) => {
    const q = nameFilter ? `?name=${encodeURIComponent(nameFilter)}` : '';
    return request<Array<{ id: number; name: string; description: string }>>(
      `/workflow-templates${q}`,
    );
  },

  /** Launch a compliance scan. */
  launchScan: (body: LaunchScanRequest) =>
    request<LaunchScanResponse>('/scan', { method: 'POST', body }),

  /** Get scan findings. */
  getFindings: (scanId?: string) => {
    const q = scanId ? `?scanId=${encodeURIComponent(scanId)}` : '';
    return request<MultiHostFinding[]>(`/findings${q}`);
  },

  /** Poll workflow job status. */
  getWorkflowStatus: (jobId: number) =>
    request<WorkflowJobStatus>(`/workflow-status/${jobId}`),

  /** Get workflow nodes for a workflow job. */
  getWorkflowNodes: (jobId: number) =>
    request<WorkflowNode[]>(`/workflow-nodes/${jobId}`),

  /** Get job events for a specific job. */
  getJobEvents: (jobId: number) =>
    request<JobEvent[]>(`/job-events/${jobId}`),

  /** Launch remediation. */
  launchRemediation: (body: LaunchRemediationRequest) =>
    request<LaunchRemediationResponse>('/remediate', { method: 'POST', body }),

  /** Get dashboard stats. */
  getDashboardStats: () => request<DashboardStats>('/dashboard'),

  /** Get posture history for trend charts. */
  getPostureHistory: (profileId?: string, days?: number) => {
    const params = new URLSearchParams();
    if (profileId) params.set('profileId', profileId);
    if (days) params.set('days', String(days));
    const q = params.toString() ? `?${params}` : '';
    return request<PostureSnapshot[]>(`/posture${q}`);
  },

  /** List saved remediation profiles. */
  getRemediationProfiles: () =>
    request<RemediationProfile[]>('/remediation-profiles'),

  /** Save a remediation profile. */
  saveRemediationProfile: (body: SaveRemediationProfileRequest) =>
    request<RemediationProfile>('/remediation-profiles', {
      method: 'POST',
      body,
    }),
};
