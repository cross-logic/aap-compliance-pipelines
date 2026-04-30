/**
 * HTTP client for the AAP Controller API.
 *
 * Follows the same patterns as upstream AAPClient in
 * @ansible/backstage-rhaap-common — undici fetch, bearer token auth,
 * Agent-based SSL handling, URL normalization.
 */
import { LoggerService } from '@backstage/backend-plugin-api';
import type { WorkflowJobStatus, WorkflowNode, JobEvent } from '@aap-compliance/common';
/** Minimal paginated response shape from Controller. */
interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
export interface ControllerClientOptions {
    baseUrl: string;
    token: string;
    checkSSL: boolean;
}
export declare class ControllerClient {
    private static readonly LOG_PREFIX;
    private readonly baseUrl;
    private readonly serviceToken;
    private readonly agent;
    private readonly logger;
    constructor(options: ControllerClientOptions, logger: LoggerService);
    /**
     * Resolve which token to use for a request.
     *
     * If a per-request user token is supplied, use it (this is the user's
     * AAP OAuth2 token obtained via the Gateway). Otherwise, fall back to
     * the service token from app-config.yaml (ansible.rhaap.token).
     *
     * This follows the upstream pattern where scaffolder actions pass the
     * user's AAP token for every Controller API call, so that AAP RBAC
     * applies to the logged-in user rather than a service account.
     */
    private resolveToken;
    private executeGetRequest;
    private executePostRequest;
    listWorkflowJobTemplates(nameFilter?: string, token?: string): Promise<PaginatedResponse<{
        id: number;
        name: string;
        description: string;
    }>>;
    launchWorkflow(workflowId: number, extraVars?: Record<string, unknown>, token?: string): Promise<{
        id: number;
        workflow_job: number;
        status: string;
    }>;
    getWorkflowJobStatus(jobId: number, token?: string): Promise<WorkflowJobStatus>;
    getWorkflowNodes(jobId: number, token?: string): Promise<PaginatedResponse<WorkflowNode>>;
    getJobStatus(jobId: number, token?: string): Promise<{
        id: number;
        status: string;
        finished: string | null;
        failed: boolean;
        elapsed: number;
    }>;
    getJobEvents(jobId: number, token?: string): Promise<PaginatedResponse<JobEvent>>;
    getJobStdout(jobId: number, token?: string): Promise<{
        content: string;
    }>;
    listInventories(token?: string): Promise<PaginatedResponse<{
        id: number;
        name: string;
        total_hosts: number;
    }>>;
    listExecutionEnvironments(token?: string): Promise<PaginatedResponse<{
        id: number;
        name: string;
        image: string;
    }>>;
    /**
     * Poll a workflow job until it reaches a terminal state.
     * Returns the final status.
     */
    pollWorkflowUntilDone(workflowJobId: number, intervalMs?: number, maxWaitMs?: number, token?: string): Promise<WorkflowJobStatus>;
    private sleep;
}
export {};
//# sourceMappingURL=ControllerClient.d.ts.map