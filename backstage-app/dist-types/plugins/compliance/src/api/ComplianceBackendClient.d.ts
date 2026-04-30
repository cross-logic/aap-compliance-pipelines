/**
 * Frontend API client that talks to the compliance backend REST API.
 *
 * Implements the ComplianceApi interface so it can be registered as a
 * Backstage API factory and consumed via useApi(complianceApiRef).
 *
 * All data flows through the backend -- the frontend never decides
 * mock vs live. The backend's ComplianceService handles the toggle.
 */
import type { ComplianceProfile, MultiHostFinding, DashboardStats, LaunchScanRequest, LaunchScanResponse, LaunchRemediationRequest, LaunchRemediationResponse, PostureSnapshot, RemediationProfile, SaveRemediationProfileRequest, WorkflowJobStatus, WorkflowNode, JobEvent, ComplianceCartridge, SaveCartridgeRequest } from '@aap-compliance/common';
import type { ComplianceApi } from './complianceApiRef';
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
export declare class ComplianceBackendClient implements ComplianceApi {
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
    private getAapToken;
    getHealth(): Promise<{
        status: string;
        dataSource: string;
    }>;
    getProfiles(): Promise<ComplianceProfile[]>;
    getInventories(): Promise<{
        id: number;
        name: string;
        hostCount: number;
    }[]>;
    getWorkflowTemplates(nameFilter?: string): Promise<{
        id: number;
        name: string;
        description: string;
    }[]>;
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
    getControllerWorkflowTemplates(): Promise<{
        id: number;
        name: string;
        description: string;
    }[]>;
    getControllerExecutionEnvironments(): Promise<{
        id: number;
        name: string;
        image: string;
    }[]>;
}
//# sourceMappingURL=ComplianceBackendClient.d.ts.map