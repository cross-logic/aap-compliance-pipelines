/**
 * Core compliance service — the single entry point for all compliance operations.
 *
 * Checks `compliance.dataSource` in app-config.yaml:
 * - 'mock' (default) → returns mock data, no AAP connection needed
 * - 'live'           → calls Controller API via ControllerClient
 */
import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import type { ComplianceProfile, MultiHostFinding, DashboardStats, LaunchScanRequest, LaunchScanResponse, LaunchRemediationRequest, LaunchRemediationResponse, PostureSnapshot, RemediationProfile, SaveRemediationProfileRequest, WorkflowJobStatus, WorkflowNode, JobEvent, RemediationSelection, RemediationPlan } from '@aap-compliance/common';
export type DataSource = 'mock' | 'live';
export declare class ComplianceService {
    private readonly dataSource;
    private readonly controllerClient;
    private readonly logger;
    constructor(config: Config, logger: LoggerService);
    getDataSource(): DataSource;
    getProfiles(): Promise<ComplianceProfile[]>;
    getInventories(token?: string): Promise<Array<{
        id: number;
        name: string;
        hostCount: number;
    }>>;
    getWorkflowTemplates(nameFilter?: string, token?: string): Promise<Array<{
        id: number;
        name: string;
        description: string;
    }>>;
    getExecutionEnvironments(token?: string): Promise<Array<{
        id: number;
        name: string;
        image: string;
    }>>;
    launchScan(request: LaunchScanRequest, token?: string): Promise<LaunchScanResponse>;
    launchRemediation(request: LaunchRemediationRequest, token?: string): Promise<LaunchRemediationResponse>;
    getFindings(_scanId?: string): Promise<MultiHostFinding[]>;
    getWorkflowJobStatus(jobId: number, token?: string): Promise<WorkflowJobStatus>;
    getWorkflowNodes(jobId: number, token?: string): Promise<WorkflowNode[]>;
    getJobEvents(jobId: number, token?: string): Promise<JobEvent[]>;
    /**
     * Build an optimized remediation plan from user selections.
     *
     * Groups rules by their target host set so that rules targeting the
     * same set of hosts are batched into a single Ansible run. This
     * avoids launching one workflow per rule, which does not scale.
     *
     * Each group produces:
     *   { tags: [rule_ids], limit: "host1,host2,...", extra_vars: {overrides}, hostCount, ruleCount }
     */
    buildRemediationPlan(selections: RemediationSelection[]): RemediationPlan;
    getDashboardStats(): Promise<DashboardStats>;
    getPostureHistory(profileId?: string, days?: number): Promise<PostureSnapshot[]>;
    getRemediationProfiles(): Promise<RemediationProfile[]>;
    saveRemediationProfile(request: SaveRemediationProfileRequest): Promise<RemediationProfile>;
}
//# sourceMappingURL=ComplianceService.d.ts.map