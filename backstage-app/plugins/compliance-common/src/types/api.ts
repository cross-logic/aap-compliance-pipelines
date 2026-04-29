/**
 * Types for the compliance backend REST API and Controller integration.
 */

import type { Finding, ScanResult } from './findings';
import type { ComplianceProfile, RemediationProfile, RemediationSelection } from './profiles';

/** Request to launch a compliance scan via the backend. */
export interface LaunchScanRequest {
  profileId: string;
  inventoryId: number;
  evaluateOnly: boolean;
  limit?: string;
}

/** Response from launching a scan. */
export interface LaunchScanResponse {
  scanId: string;
  workflowJobId: number;
  status: string;
}

/** Request to launch remediation via the backend. */
export interface LaunchRemediationRequest {
  profileId: string;
  inventoryId: number;
  selections: RemediationSelection[];
  limit?: string;
}

/** Response from launching remediation. */
export interface LaunchRemediationResponse {
  remediationId: string;
  workflowJobId: number;
  status: string;
}

/** Posture snapshot for historical trend tracking. */
export interface PostureSnapshot {
  id: string;
  profileId: string;
  timestamp: string;
  totalHosts: number;
  totalRules: number;
  passCount: number;
  failCount: number;
  compliancePct: number;
}

/** Scan record stored in the database. */
export interface ComplianceScan {
  id: string;
  profileId: string;
  inventoryId: number;
  scanner: string;
  workflowJobId: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
}

/** Stored finding row (flattened per-host). */
export interface StoredFinding {
  id: string;
  scanId: string;
  ruleId: string;
  stigId: string;
  host: string;
  status: string;
  severity: string;
  actualValue: string;
  expectedValue: string;
  evidence: string | null;
}

/** Multi-host aggregated finding used by the frontend. */
export interface MultiHostFinding {
  ruleId: string;
  stigId: string;
  title: string;
  description: string;
  fixText: string;
  checkText: string;
  severity: 'CAT_I' | 'CAT_II' | 'CAT_III';
  category: string;
  disruption: 'low' | 'medium' | 'high';
  parameters: Array<{
    name: string;
    label: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    default: string | number | boolean;
    value: string | number | boolean;
    options?: Array<{ label: string; value: string | number }>;
  }>;
  hosts: Array<{
    host: string;
    status: 'pass' | 'fail' | 'error';
    actualValue: string;
    expectedValue: string;
  }>;
  passCount: number;
  failCount: number;
  totalCount: number;
}

/** Controller workflow job status response (subset of AWX API). */
export interface WorkflowJobStatus {
  id: number;
  status: string;
  finished: string | null;
  failed: boolean;
  elapsed: number;
  name: string;
}

/** Controller workflow node (subset of AWX API). */
export interface WorkflowNode {
  id: number;
  summary_fields: {
    job?: {
      id: number;
      name: string;
      status: string;
      type: string;
    };
  };
  identifier: string;
}

/** Controller job event (subset of AWX API). */
export interface JobEvent {
  id: number;
  event: string;
  event_data: Record<string, unknown>;
  stdout: string;
  host_name: string;
}

/** Saved remediation profile request body. */
export interface SaveRemediationProfileRequest {
  name: string;
  description: string;
  complianceProfileId: string;
  selections: RemediationSelection[];
}

/** Recent scan entry for dashboard display. */
export interface RecentScan {
  id: string;
  profileName: string;
  inventoryName: string;
  passRate: number;
  timestamp: string;
  status: string;
}

/** Dashboard stats summary. */
export interface DashboardStats {
  hostsScanned: number;
  criticalFindings: number;
  pendingRemediation: number;
  activeProfiles: number;
  recentScans: RecentScan[];
  frameworkScores: Array<{
    name: string;
    target: string;
    rules: number;
    rate: number;
    lastScan: string;
  }>;
}

/** A compliance cartridge maps a framework profile to Controller resources. */
export interface ComplianceCartridge {
  id: string;
  displayName: string;
  description: string;
  framework: string;
  version: string;
  platform: string;
  workflowTemplateId: number | null;
  eeId: number | null;
  remediationPlaybookPath: string;
  scanTags: string;
  createdAt: string;
  updatedAt: string;
}

/** Request to create or update a cartridge. */
export interface SaveCartridgeRequest {
  id?: string;
  displayName: string;
  description: string;
  framework: string;
  version: string;
  platform: string;
  workflowTemplateId: number | null;
  eeId: number | null;
  remediationPlaybookPath: string;
  scanTags: string;
}
