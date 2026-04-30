import type { Finding } from '@aap-compliance/common';
export interface HostFinding {
    host: string;
    status: 'pass' | 'fail' | 'error';
    actualValue: string;
    expectedValue: string;
}
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
        options?: Array<{
            label: string;
            value: string | number;
        }>;
    }>;
    hosts: HostFinding[];
    passCount: number;
    failCount: number;
    totalCount: number;
}
export declare const MOCK_MULTI_HOST_FINDINGS: MultiHostFinding[];
export declare const MOCK_FINDINGS: Finding[];
//# sourceMappingURL=mockFindings.d.ts.map