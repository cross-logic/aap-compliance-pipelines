import type { ComplianceProfile, MultiHostFinding, DashboardStats, LaunchScanRequest, LaunchScanResponse, LaunchRemediationRequest, LaunchRemediationResponse, PostureSnapshot, RemediationProfile, SaveRemediationProfileRequest, WorkflowJobStatus, WorkflowNode, JobEvent, ComplianceCartridge, SaveCartridgeRequest } from '@aap-compliance/common';
/** Interface for the compliance backend API. */
export interface ComplianceApi {
    getHealth(): Promise<{
        status: string;
        dataSource: string;
    }>;
    getProfiles(): Promise<ComplianceProfile[]>;
    getInventories(): Promise<Array<{
        id: number;
        name: string;
        hostCount: number;
    }>>;
    getWorkflowTemplates(nameFilter?: string): Promise<Array<{
        id: number;
        name: string;
        description: string;
    }>>;
    launchScan(body: LaunchScanRequest): Promise<LaunchScanResponse>;
    getFindings(scanId?: string): Promise<MultiHostFinding[]>;
    getWorkflowStatus(jobId: number): Promise<WorkflowJobStatus>;
    getWorkflowNodes(jobId: number): Promise<WorkflowNode[]>;
    getJobEvents(jobId: number): Promise<JobEvent[]>;
    launchRemediation(body: LaunchRemediationRequest): Promise<LaunchRemediationResponse>;
    getDashboardStats(): Promise<DashboardStats>;
    getPostureHistory(profileId?: string, days?: number): Promise<PostureSnapshot[]>;
    getRemediationProfiles(): Promise<RemediationProfile[]>;
    saveRemediationProfile(body: SaveRemediationProfileRequest): Promise<RemediationProfile>;
    getCartridges(): Promise<ComplianceCartridge[]>;
    saveCartridge(body: SaveCartridgeRequest): Promise<ComplianceCartridge>;
    deleteCartridge(id: string): Promise<void>;
    getControllerWorkflowTemplates(): Promise<Array<{
        id: number;
        name: string;
        description: string;
    }>>;
    getControllerExecutionEnvironments(): Promise<Array<{
        id: number;
        name: string;
        image: string;
    }>>;
}
/** API ref for the compliance plugin, consumed via useApi(complianceApiRef). */
export declare const complianceApiRef: import("@backstage/frontend-plugin-api").ApiRef<ComplianceApi>;
//# sourceMappingURL=complianceApiRef.d.ts.map