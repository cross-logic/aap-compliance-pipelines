import type { ComplianceProfile, ScanResult, RemediationProfile } from '../types';
export interface ComplianceApiClientOptions {
    baseUrl: string;
    token: string;
    checkSSL?: boolean;
}
export declare class ComplianceApiClient {
    private baseUrl;
    private token;
    private agent;
    constructor(options: ComplianceApiClientOptions);
    private request;
    getOrganizations(): Promise<{
        results: Array<{
            id: number;
            name: string;
        }>;
    }>;
    getInventories(): Promise<{
        results: Array<{
            id: number;
            name: string;
        }>;
    }>;
    getJobTemplates(nameFilter?: string): Promise<{
        results: Array<{
            id: number;
            name: string;
            description: string;
            status: string;
        }>;
    }>;
    launchJobTemplate(templateId: number, extraVars?: Record<string, unknown>, inventory?: number): Promise<{
        id: number;
        status: string;
        url: string;
    }>;
    getJobStatus(jobId: number): Promise<{
        id: number;
        status: string;
        finished: string | null;
        failed: boolean;
        elapsed: number;
    }>;
    getJobEvents(jobId: number): Promise<{
        results: Array<{
            event: string;
            event_data: Record<string, unknown>;
            stdout: string;
        }>;
    }>;
    getWorkflowJobTemplates(nameFilter?: string): Promise<{
        results: Array<{
            id: number;
            name: string;
            description: string;
        }>;
    }>;
    launchWorkflow(templateId: number, extraVars?: Record<string, unknown>): Promise<{
        id: number;
        status: string;
    }>;
    getProfiles(): Promise<ComplianceProfile[]>;
    getScanResults(_scanJobId: number): Promise<ScanResult>;
    saveRemediationProfile(_profile: RemediationProfile): Promise<RemediationProfile>;
}
//# sourceMappingURL=ComplianceApiClient.d.ts.map