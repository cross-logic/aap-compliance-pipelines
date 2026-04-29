/**
 * Frontend API client that talks to the compliance backend REST API.
 *
 * Implements the ComplianceApi interface so it can be registered as a
 * Backstage API factory and consumed via useApi(complianceApiRef).
 *
 * All data flows through the backend -- the frontend never decides
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
  ComplianceCartridge,
  SaveCartridgeRequest,
} from '@aap-compliance/common';

import type { ComplianceApi } from './complianceApiRef';

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

  // 204 No Content -- return undefined (cast to T for void responses)
  if (resp.status === 204) {
    return undefined as T;
  }

  return (await resp.json()) as T;
}

// ─── ComplianceBackendClient ─────────────────────────────────────────

/**
 * Default implementation of ComplianceApi.
 *
 * Uses direct fetch() for the prototype. In a production RHDH
 * deployment, this would use Backstage's fetchApiRef to attach
 * identity tokens and handle proxy routing automatically.
 */
export class ComplianceBackendClient implements ComplianceApi {
  getHealth() {
    return request<{ status: string; dataSource: string }>('/health');
  }

  getProfiles() {
    return request<ComplianceProfile[]>('/profiles');
  }

  getInventories() {
    return request<Array<{ id: number; name: string; hostCount: number }>>('/inventories');
  }

  getWorkflowTemplates(nameFilter?: string) {
    const q = nameFilter ? `?name=${encodeURIComponent(nameFilter)}` : '';
    return request<Array<{ id: number; name: string; description: string }>>(
      `/workflow-templates${q}`,
    );
  }

  launchScan(body: LaunchScanRequest) {
    return request<LaunchScanResponse>('/scan', { method: 'POST', body });
  }

  getFindings(scanId?: string) {
    const q = scanId ? `?scanId=${encodeURIComponent(scanId)}` : '';
    return request<MultiHostFinding[]>(`/findings${q}`);
  }

  getWorkflowStatus(jobId: number) {
    return request<WorkflowJobStatus>(`/workflow-status/${jobId}`);
  }

  getWorkflowNodes(jobId: number) {
    return request<WorkflowNode[]>(`/workflow-nodes/${jobId}`);
  }

  getJobEvents(jobId: number) {
    return request<JobEvent[]>(`/job-events/${jobId}`);
  }

  launchRemediation(body: LaunchRemediationRequest) {
    return request<LaunchRemediationResponse>('/remediate', { method: 'POST', body });
  }

  getDashboardStats() {
    return request<DashboardStats>('/dashboard');
  }

  getPostureHistory(profileId?: string, days?: number) {
    const params = new URLSearchParams();
    if (profileId) params.set('profileId', profileId);
    if (days) params.set('days', String(days));
    const q = params.toString() ? `?${params}` : '';
    return request<PostureSnapshot[]>(`/posture${q}`);
  }

  getRemediationProfiles() {
    return request<RemediationProfile[]>('/remediation-profiles');
  }

  saveRemediationProfile(body: SaveRemediationProfileRequest) {
    return request<RemediationProfile>('/remediation-profiles', {
      method: 'POST',
      body,
    });
  }

  getCartridges() {
    return request<ComplianceCartridge[]>('/cartridges');
  }

  saveCartridge(body: SaveCartridgeRequest) {
    return request<ComplianceCartridge>('/cartridges', { method: 'POST', body });
  }

  deleteCartridge(id: string) {
    return request<void>(`/cartridges/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  getControllerWorkflowTemplates() {
    return request<Array<{ id: number; name: string; description: string }>>(
      '/controller/workflow-job-templates',
    );
  }

  getControllerExecutionEnvironments() {
    return request<Array<{ id: number; name: string; image: string }>>(
      '/controller/execution-environments',
    );
  }
}
