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

import { DiscoveryApi } from '@backstage/core-plugin-api';
import type { ComplianceApi } from './complianceApiRef';

let discoveryApi: DiscoveryApi | undefined;
let resolvedBaseUrl: string | undefined;

export function setDiscoveryApi(api: DiscoveryApi) {
  discoveryApi = api;
}

async function getBackendBase(): Promise<string> {
  if (resolvedBaseUrl) return resolvedBaseUrl;
  if (discoveryApi) {
    try {
      resolvedBaseUrl = await discoveryApi.getBaseUrl('compliance');
      return resolvedBaseUrl;
    } catch {
      // fall through to default
    }
  }
  // Fallback: if backend runs on same host, use relative path
  // If running separately (dev mode), use explicit backend URL
  return 'http://localhost:7007/api/compliance';
}

async function request<T>(
  path: string,
  options?: { method?: string; body?: unknown; aapToken?: string },
): Promise<T> {
  const base = await getBackendBase();
  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // When an AAP token is available, pass it to the backend so that
  // Controller API calls are made as the logged-in user (AAP RBAC).
  // The backend reads this from the x-aap-token header.
  if (options?.aapToken) {
    headers['x-aap-token'] = options.aapToken;
  }

  const resp = await fetch(url, {
    method: options?.method ?? 'GET',
    headers,
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
 *
 * AAP token flow:
 * When the auth-backend-module-rhaap-provider is integrated, the
 * user's AAP OAuth2 token would be obtained via rhAapAuthApiRef
 * and passed to every mutating request (scan, remediate, etc.).
 * For now, getAapToken() returns undefined and the backend falls
 * back to the service token from app-config.yaml.
 */
export class ComplianceBackendClient implements ComplianceApi {
  /**
   * Obtain the user's AAP OAuth2 access token.
   *
   * When the auth-backend-module-rhaap-provider is integrated, this
   * would call rhAapAuthApiRef.getAccessToken() — exactly as the
   * upstream self-service plugin does in Home.tsx and AAPTokenField.
   *
   * Returns undefined until the auth module is wired up, which
   * causes the backend to fall back to the service token.
   */
  private async getAapToken(): Promise<string | undefined> {
    try {
      // TODO: When auth module is integrated, replace with:
      //   const rhAapAuthApi = ... // injected via constructor
      //   return await rhAapAuthApi.getAccessToken();
      return undefined;
    } catch {
      return undefined;
    }
  }

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

  async launchScan(body: LaunchScanRequest) {
    const aapToken = await this.getAapToken();
    return request<LaunchScanResponse>('/scan', { method: 'POST', body, aapToken });
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

  async launchRemediation(body: LaunchRemediationRequest) {
    const aapToken = await this.getAapToken();
    return request<LaunchRemediationResponse>('/remediate', { method: 'POST', body, aapToken });
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

  async saveCartridge(body: SaveCartridgeRequest) {
    const aapToken = await this.getAapToken();
    return request<ComplianceCartridge>('/cartridges', { method: 'POST', body, aapToken });
  }

  async deleteCartridge(id: string) {
    const aapToken = await this.getAapToken();
    return request<void>(`/cartridges/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      aapToken,
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
