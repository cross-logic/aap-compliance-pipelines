/**
 * Core compliance service — the single entry point for all compliance operations.
 *
 * Checks `compliance.dataSource` in app-config.yaml:
 * - 'mock' (default) → returns mock data, no AAP connection needed
 * - 'live'           → calls Controller API via ControllerClient
 */
import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';

import type {
  ComplianceProfile,
  MultiHostFinding,
  DashboardStats,
  LaunchScanRequest,
  LaunchScanResponse,
  LaunchRemediationRequest,
  LaunchRemediationResponse,
  PostureSnapshot,
  RemediationProfile,
  SaveRemediationProfileRequest,
  WorkflowJobStatus,
  WorkflowNode,
  JobEvent,
} from '@aap-compliance/common';

import { ControllerClient } from './ControllerClient';
import { MockDataProvider } from './MockDataProvider';

export type DataSource = 'mock' | 'live';

export class ComplianceService {
  private readonly dataSource: DataSource;
  private readonly controllerClient: ControllerClient | null;
  private readonly logger: LoggerService;

  constructor(config: Config, logger: LoggerService) {
    this.logger = logger;

    // Read the toggle flag — default to 'mock' for safe demos
    const rawSource = config.getOptionalString('compliance.dataSource') ?? 'mock';
    this.dataSource = rawSource === 'live' ? 'live' : 'mock';

    this.logger.info(
      `ComplianceService initialized with dataSource=${this.dataSource}`,
    );

    // Only construct the Controller client when in live mode
    if (this.dataSource === 'live') {
      const ansibleConfig = config.getOptionalConfig('ansible');
      const baseUrl = ansibleConfig?.getOptionalString('rhaap.baseUrl') ?? '';
      const token = ansibleConfig?.getOptionalString('rhaap.token') ?? '';
      const checkSSL = ansibleConfig?.getOptionalBoolean('rhaap.checkSSL') ?? true;

      if (!baseUrl || !token) {
        throw new Error(
          'compliance.dataSource is "live" but ansible.rhaap.baseUrl / ansible.rhaap.token are not configured',
        );
      }

      this.controllerClient = new ControllerClient(
        { baseUrl, token, checkSSL },
        logger,
      );
    } else {
      this.controllerClient = null;
    }
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  // ─── Profiles ───────────────────────────────────────────────────────

  async getProfiles(): Promise<ComplianceProfile[]> {
    // Profiles are always static metadata in both modes
    return MockDataProvider.getProfiles();
  }

  // ─── Inventories ────────────────────────────────────────────────────

  async getInventories(): Promise<Array<{ id: number; name: string; hostCount: number }>> {
    if (this.dataSource === 'mock') {
      return MockDataProvider.getInventories().map(inv => ({
        id: inv.id,
        name: inv.name,
        hostCount: inv.total_hosts,
      }));
    }

    const result = await this.controllerClient!.listInventories();
    return result.results.map(inv => ({
      id: inv.id,
      name: inv.name,
      hostCount: inv.total_hosts,
    }));
  }

  // ─── Workflow templates ─────────────────────────────────────────────

  async getWorkflowTemplates(
    nameFilter?: string,
  ): Promise<Array<{ id: number; name: string; description: string }>> {
    if (this.dataSource === 'mock') {
      return MockDataProvider.getWorkflowTemplates(nameFilter);
    }

    const result = await this.controllerClient!.listWorkflowJobTemplates(nameFilter);
    return result.results;
  }

  // ─── Execution environments ─────────────────────────────────────────

  async getExecutionEnvironments(): Promise<Array<{ id: number; name: string; image: string }>> {
    if (this.dataSource === 'mock') {
      return MockDataProvider.getExecutionEnvironments();
    }

    const result = await this.controllerClient!.listExecutionEnvironments();
    return result.results;
  }

  // ─── Scan ───────────────────────────────────────────────────────────

  async launchScan(request: LaunchScanRequest): Promise<LaunchScanResponse> {
    if (this.dataSource === 'mock') {
      return MockDataProvider.launchScan(request.profileId);
    }

    // In live mode: find the matching workflow job template, then launch it
    const templates = await this.controllerClient!.listWorkflowJobTemplates('compliance');
    const template = templates.results.find(t =>
      t.name.toLowerCase().includes(request.profileId.replace(/-/g, '_')),
    ) ?? templates.results[0];

    if (!template) {
      throw new Error(`No compliance workflow template found for profile ${request.profileId}`);
    }

    const extraVars: Record<string, unknown> = {
      compliance_profile: request.profileId,
      evaluate_only: request.evaluateOnly,
    };
    if (request.limit) {
      extraVars.limit_hosts = request.limit;
    }

    const launch = await this.controllerClient!.launchWorkflow(template.id, extraVars);

    return {
      scanId: `scan-${launch.workflow_job ?? launch.id}`,
      workflowJobId: launch.workflow_job ?? launch.id,
      status: launch.status,
    };
  }

  // ─── Remediation ────────────────────────────────────────────────────

  async launchRemediation(
    request: LaunchRemediationRequest,
  ): Promise<LaunchRemediationResponse> {
    if (this.dataSource === 'mock') {
      return MockDataProvider.launchRemediation();
    }

    const templates = await this.controllerClient!.listWorkflowJobTemplates('compliance');
    const template = templates.results.find(t =>
      t.name.toLowerCase().includes('remediat'),
    ) ?? templates.results[0];

    if (!template) {
      throw new Error('No compliance remediation workflow template found');
    }

    const extraVars: Record<string, unknown> = {
      compliance_profile: request.profileId,
      remediation_selections: request.selections,
    };
    if (request.limit) {
      extraVars.limit_hosts = request.limit;
    }

    const launch = await this.controllerClient!.launchWorkflow(template.id, extraVars);

    return {
      remediationId: `remediation-${launch.workflow_job ?? launch.id}`,
      workflowJobId: launch.workflow_job ?? launch.id,
      status: launch.status,
    };
  }

  // ─── Findings ───────────────────────────────────────────────────────

  async getFindings(_scanId?: string): Promise<MultiHostFinding[]> {
    if (this.dataSource === 'mock') {
      return MockDataProvider.getFindings();
    }

    // In live mode, we would parse scan job events into MultiHostFinding[].
    // For the prototype, fall back to mock if no real scan data is available.
    this.logger.warn('Live findings parsing not yet implemented — returning mock data');
    return MockDataProvider.getFindings();
  }

  // ─── Workflow status (for polling) ──────────────────────────────────

  async getWorkflowJobStatus(jobId: number): Promise<WorkflowJobStatus> {
    if (this.dataSource === 'mock') {
      // Simulate a job that progresses to completion
      return {
        id: jobId,
        status: 'successful',
        finished: new Date().toISOString(),
        failed: false,
        elapsed: 45.2,
        name: 'compliance-scan-mock',
      };
    }

    return this.controllerClient!.getWorkflowJobStatus(jobId);
  }

  async getWorkflowNodes(
    jobId: number,
  ): Promise<WorkflowNode[]> {
    if (this.dataSource === 'mock') {
      return [];
    }

    const result = await this.controllerClient!.getWorkflowNodes(jobId);
    return result.results;
  }

  async getJobEvents(jobId: number): Promise<JobEvent[]> {
    if (this.dataSource === 'mock') {
      return [];
    }

    const result = await this.controllerClient!.getJobEvents(jobId);
    return result.results;
  }

  // ─── Dashboard ──────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    // Always mock for now — in production this reads from the database
    return MockDataProvider.getDashboardStats();
  }

  // ─── Posture history ────────────────────────────────────────────────

  async getPostureHistory(
    profileId?: string,
    days?: number,
  ): Promise<PostureSnapshot[]> {
    return MockDataProvider.getPostureHistory(profileId, days);
  }

  // ─── Remediation profiles ──────────────────────────────────────────

  async getRemediationProfiles(): Promise<RemediationProfile[]> {
    return MockDataProvider.getRemediationProfiles();
  }

  async saveRemediationProfile(
    request: SaveRemediationProfileRequest,
  ): Promise<RemediationProfile> {
    const profile: RemediationProfile = {
      id: '',
      name: request.name,
      description: request.description,
      complianceProfileId: request.complianceProfileId,
      targetInventory: '',
      selections: request.selections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return MockDataProvider.saveRemediationProfile(profile);
  }
}
