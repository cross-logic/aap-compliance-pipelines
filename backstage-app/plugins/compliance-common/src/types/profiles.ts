export type ComplianceFramework = 'DISA_STIG' | 'CIS' | 'PCI_DSS' | 'HIPAA' | 'NIST_800_53';

export interface ComplianceProfile {
  id: string;
  name: string;
  framework: ComplianceFramework;
  version: string;
  description: string;
  applicableOs: string[];
  ruleCount: number;
  lastUpdated: string;
  source: string;
}

export interface RemediationSelection {
  ruleId: string;
  enabled: boolean;
  parameters: Record<string, string | number | boolean>;
  /** Scope of remediation: 'failed_only' (default) or 'standardize_all'. */
  scope?: 'failed_only' | 'standardize_all';
}

export interface RemediationProfile {
  id: string;
  name: string;
  description: string;
  complianceProfileId: string;
  /** The scan ID (workflow job ID) whose findings were used to create this profile. */
  scanId?: string;
  targetInventory: string;
  selections: RemediationSelection[];
  createdAt: string;
  updatedAt: string;
}
