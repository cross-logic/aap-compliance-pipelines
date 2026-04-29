/**
 * HTTP client for the AAP Controller API.
 *
 * Follows the same patterns as upstream AAPClient in
 * @ansible/backstage-rhaap-common — undici fetch, bearer token auth,
 * Agent-based SSL handling, URL normalization.
 */
import { LoggerService } from '@backstage/backend-plugin-api';
import { Agent, fetch } from 'undici';

import type {
  WorkflowJobStatus,
  WorkflowNode,
  JobEvent,
} from '@aap-compliance/common';

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

export class ControllerClient {
  private static readonly LOG_PREFIX = 'compliance-controller-client';

  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly agent: Agent;
  private readonly logger: LoggerService;

  constructor(options: ControllerClientOptions, logger: LoggerService) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.serviceToken = options.token;
    this.logger = logger;
    this.agent = new Agent({
      connect: { rejectUnauthorized: options.checkSSL },
    });
  }

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
  private resolveToken(token?: string): string {
    return token ?? this.serviceToken;
  }

  // ─── Low-level request helpers (match upstream AAPClient) ───────────

  private async executeGetRequest<T>(
    endpoint: string,
    token?: string,
  ): Promise<T> {
    const normalizedEndpoint = endpoint.replace(/^\/+/, '');
    const url = `${this.baseUrl}/${normalizedEndpoint}`;
    this.logger.info(
      `[${ControllerClient.LOG_PREFIX}]: GET ${url}`,
    );

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        dispatcher: this.agent,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.resolveToken(token)}`,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${ControllerClient.LOG_PREFIX}]: Failed GET ${url}: ${msg}`,
      );
      throw new Error(`Failed to fetch ${url}: ${msg}`);
    }

    if (!response.ok) {
      this.logger.error(
        `[${ControllerClient.LOG_PREFIX}]: GET ${url} returned ${response.status} ${response.statusText}`,
      );
      if (response.status === 403) {
        throw new Error('Insufficient privileges. Please contact your administrator.');
      }
      throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  private async executePostRequest<T>(
    endpoint: string,
    data?: unknown,
    token?: string,
  ): Promise<T> {
    const normalizedEndpoint = endpoint.replace(/^\/+/, '');
    const url = `${this.baseUrl}/${normalizedEndpoint}`;
    this.logger.info(
      `[${ControllerClient.LOG_PREFIX}]: POST ${url}`,
    );

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        dispatcher: this.agent,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.resolveToken(token)}`,
        },
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${ControllerClient.LOG_PREFIX}]: Failed POST ${url}: ${msg}`,
      );
      throw new Error(`Failed to POST ${url}: ${msg}`);
    }

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorBody = await response.json();
        errorDetail = JSON.stringify(errorBody);
      } catch {
        // body not parseable
      }
      this.logger.error(
        `[${ControllerClient.LOG_PREFIX}]: POST ${url} returned ${response.status}: ${errorDetail}`,
      );
      if (response.status === 403) {
        throw new Error('Insufficient privileges. Please contact your administrator.');
      }
      throw new Error(`POST ${url} failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  // ─── Workflow Job Templates ─────────────────────────────────────────

  async listWorkflowJobTemplates(
    nameFilter?: string,
    token?: string,
  ): Promise<PaginatedResponse<{ id: number; name: string; description: string }>> {
    const query = nameFilter
      ? `?name__startswith=${encodeURIComponent(nameFilter)}`
      : '';
    return this.executeGetRequest(
      `api/controller/v2/workflow_job_templates/${query}`,
      token,
    );
  }

  async launchWorkflow(
    workflowId: number,
    extraVars?: Record<string, unknown>,
    token?: string,
  ): Promise<{ id: number; workflow_job: number; status: string }> {
    const body: Record<string, unknown> = {};
    if (extraVars) {
      body.extra_vars = JSON.stringify(extraVars);
    }
    return this.executePostRequest(
      `api/controller/v2/workflow_job_templates/${workflowId}/launch/`,
      body,
      token,
    );
  }

  // ─── Workflow Jobs ──────────────────────────────────────────────────

  async getWorkflowJobStatus(jobId: number, token?: string): Promise<WorkflowJobStatus> {
    return this.executeGetRequest(`api/controller/v2/workflow_jobs/${jobId}/`, token);
  }

  async getWorkflowNodes(
    jobId: number,
    token?: string,
  ): Promise<PaginatedResponse<WorkflowNode>> {
    return this.executeGetRequest(
      `api/controller/v2/workflow_jobs/${jobId}/workflow_nodes/?page_size=200`,
      token,
    );
  }

  // ─── Jobs ───────────────────────────────────────────────────────────

  async getJobStatus(jobId: number, token?: string): Promise<{
    id: number;
    status: string;
    finished: string | null;
    failed: boolean;
    elapsed: number;
  }> {
    return this.executeGetRequest(`api/controller/v2/jobs/${jobId}/`, token);
  }

  async getJobEvents(
    jobId: number,
    token?: string,
  ): Promise<PaginatedResponse<JobEvent>> {
    return this.executeGetRequest(
      `api/controller/v2/jobs/${jobId}/job_events/?page_size=200`,
      token,
    );
  }

  async getJobStdout(jobId: number, token?: string): Promise<{ content: string }> {
    return this.executeGetRequest(
      `api/controller/v2/jobs/${jobId}/stdout/?format=json`,
      token,
    );
  }

  // ─── Inventories & Execution Environments ───────────────────────────

  async listInventories(token?: string): Promise<
    PaginatedResponse<{ id: number; name: string; total_hosts: number }>
  > {
    return this.executeGetRequest(
      'api/controller/v2/inventories/?order_by=name&page_size=200',
      token,
    );
  }

  async listExecutionEnvironments(token?: string): Promise<
    PaginatedResponse<{ id: number; name: string; image: string }>
  > {
    return this.executeGetRequest(
      'api/controller/v2/execution_environments/?order_by=name&page_size=200',
      token,
    );
  }

  // ─── Polling helper (match upstream fetchResult pattern) ────────────

  /**
   * Poll a workflow job until it reaches a terminal state.
   * Returns the final status.
   */
  async pollWorkflowUntilDone(
    workflowJobId: number,
    intervalMs: number = 3000,
    maxWaitMs: number = 600_000,
    token?: string,
  ): Promise<WorkflowJobStatus> {
    const terminalStatuses = ['successful', 'failed', 'error', 'canceled'];
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const status = await this.getWorkflowJobStatus(workflowJobId, token);
      if (terminalStatuses.includes(status.status.toLowerCase())) {
        return status;
      }
      await this.sleep(intervalMs);
    }

    throw new Error(
      `Workflow job ${workflowJobId} did not complete within ${maxWaitMs}ms`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const id = setTimeout(() => {
        resolve();
        clearTimeout(id);
      }, ms);
    });
  }
}
