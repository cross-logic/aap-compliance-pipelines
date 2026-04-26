import { fetch as undiciFetch, Agent } from 'undici';
import type {
  ComplianceProfile,
  ScanResult,
  RemediationProfile,
} from '../types';

export interface ComplianceApiClientOptions {
  baseUrl: string;
  token: string;
  checkSSL?: boolean;
}

export class ComplianceApiClient {
  private baseUrl: string;
  private token: string;
  private agent: Agent;

  constructor(options: ComplianceApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.agent = new Agent({
      connect: { rejectUnauthorized: options.checkSSL ?? true },
    });
  }

  private async request<T>(
    endpoint: string,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await undiciFetch(url, {
      method: options?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      dispatcher: this.agent,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }

  async getOrganizations(): Promise<{ results: Array<{ id: number; name: string }> }> {
    return this.request('/api/gateway/v1/organizations/');
  }

  async getInventories(): Promise<{ results: Array<{ id: number; name: string }> }> {
    return this.request('/api/controller/v2/inventories/');
  }

  async getJobTemplates(nameFilter?: string): Promise<{
    results: Array<{
      id: number;
      name: string;
      description: string;
      status: string;
    }>;
  }> {
    const query = nameFilter ? `?name__startswith=${encodeURIComponent(nameFilter)}` : '';
    return this.request(`/api/controller/v2/job_templates/${query}`);
  }

  async launchJobTemplate(
    templateId: number,
    extraVars?: Record<string, unknown>,
    inventory?: number,
  ): Promise<{ id: number; status: string; url: string }> {
    const body: Record<string, unknown> = {};
    if (extraVars) body.extra_vars = JSON.stringify(extraVars);
    if (inventory) body.inventory = inventory;

    return this.request(`/api/controller/v2/job_templates/${templateId}/launch/`, {
      method: 'POST',
      body,
    });
  }

  async getJobStatus(jobId: number): Promise<{
    id: number;
    status: string;
    finished: string | null;
    failed: boolean;
    elapsed: number;
  }> {
    return this.request(`/api/controller/v2/jobs/${jobId}/`);
  }

  async getJobEvents(jobId: number): Promise<{
    results: Array<{
      event: string;
      event_data: Record<string, unknown>;
      stdout: string;
    }>;
  }> {
    return this.request(`/api/controller/v2/jobs/${jobId}/job_events/?page_size=200`);
  }

  async getWorkflowJobTemplates(nameFilter?: string): Promise<{
    results: Array<{
      id: number;
      name: string;
      description: string;
    }>;
  }> {
    const query = nameFilter ? `?name__startswith=${encodeURIComponent(nameFilter)}` : '';
    return this.request(`/api/controller/v2/workflow_job_templates/${query}`);
  }

  async launchWorkflow(
    templateId: number,
    extraVars?: Record<string, unknown>,
  ): Promise<{ id: number; status: string }> {
    const body: Record<string, unknown> = {};
    if (extraVars) body.extra_vars = JSON.stringify(extraVars);
    return this.request(`/api/controller/v2/workflow_job_templates/${templateId}/launch/`, {
      method: 'POST',
      body,
    });
  }

  async getProfiles(): Promise<ComplianceProfile[]> {
    // For prototype: profiles are static metadata from the compliance pattern
    // In production: these would come from Automation Hub pattern discovery
    return BUILTIN_PROFILES;
  }

  async getScanResults(_scanJobId: number): Promise<ScanResult> {
    // For prototype: parse job artifacts/events into ScanResult format
    // In production: structured scan output stored in a backend
    throw new Error('Not implemented — use parseScanJobEvents() instead');
  }

  async saveRemediationProfile(
    _profile: RemediationProfile,
  ): Promise<RemediationProfile> {
    // For prototype: store in local state / localStorage
    // In production: persist in backend database
    throw new Error('Not implemented — profiles stored client-side for prototype');
  }
}

const BUILTIN_PROFILES: ComplianceProfile[] = [
  {
    id: 'rhel9-stig',
    name: 'DISA STIG for RHEL 9',
    framework: 'DISA_STIG',
    version: 'V2R8',
    description:
      'Security Technical Implementation Guide for Red Hat Enterprise Linux 9, based on DISA STIG V2R8. Covers access controls, audit logging, authentication, encryption, and system hardening.',
    applicableOs: ['RHEL 9'],
    ruleCount: 366,
    lastUpdated: '2025-10-25',
    source: 'ComplianceAsCode/content',
  },
  {
    id: 'rhel9-cis-l1',
    name: 'CIS Benchmark RHEL 9 — Level 1 Server',
    framework: 'CIS',
    version: '1.0.0',
    description:
      'CIS Benchmark Level 1 for RHEL 9 servers. Provides a baseline security configuration with minimal impact on system functionality.',
    applicableOs: ['RHEL 9'],
    ruleCount: 189,
    lastUpdated: '2025-06-15',
    source: 'ComplianceAsCode/content',
  },
  {
    id: 'rhel9-pci-dss',
    name: 'PCI-DSS v4.0 for RHEL 9',
    framework: 'PCI_DSS',
    version: '4.0',
    description:
      'Payment Card Industry Data Security Standard v4.0 controls mapped to RHEL 9 system configuration requirements.',
    applicableOs: ['RHEL 9'],
    ruleCount: 142,
    lastUpdated: '2025-03-20',
    source: 'ComplianceAsCode/content',
  },
];
