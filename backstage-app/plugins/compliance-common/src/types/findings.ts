export type FindingSeverity = 'CAT_I' | 'CAT_II' | 'CAT_III';
export type FindingStatus = 'pass' | 'fail' | 'error' | 'notapplicable' | 'notchecked';
export type DisruptionLevel = 'low' | 'medium' | 'high';

export interface FindingParameter {
  name: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default: string | number | boolean;
  value: string | number | boolean;
  options?: { label: string; value: string | number }[];
}

export interface Finding {
  ruleId: string;
  stigId: string;
  title: string;
  description: string;
  fixText: string;
  checkText: string;
  severity: FindingSeverity;
  status: FindingStatus;
  category: string;
  disruption: DisruptionLevel;
  parameters: FindingParameter[];
}

export interface ScanResult {
  id: string;
  profileId: string;
  profileName: string;
  targetHosts: string[];
  timestamp: string;
  findings: Finding[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    error: number;
    notapplicable: number;
    notchecked: number;
  };
}
