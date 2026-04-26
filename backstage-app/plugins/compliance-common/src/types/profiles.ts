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
}

export interface RemediationProfile {
  id: string;
  name: string;
  description: string;
  complianceProfileId: string;
  targetInventory: string;
  selections: RemediationSelection[];
  createdAt: string;
  updatedAt: string;
}
