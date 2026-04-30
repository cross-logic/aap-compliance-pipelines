/**
 * Express router for the compliance backend plugin.
 *
 * All routes are prefixed with /api/compliance by the plugin registration.
 */
import express from 'express';
import Router from 'express-promise-router';
import { LoggerService } from '@backstage/backend-plugin-api';

import { ComplianceService } from './service/ComplianceService';
import { ComplianceDatabase } from './database/ComplianceDatabase';

import type {
  LaunchScanRequest,
  LaunchRemediationRequest,
  SaveRemediationProfileRequest,
  SaveCartridgeRequest,
} from '@aap-compliance/common';

export interface RouterOptions {
  logger: LoggerService;
  service: ComplianceService;
  database: ComplianceDatabase;
}

// ─── Token extraction ─────────────────────────────────────────────────

/**
 * Extract the user's AAP OAuth2 token from the request.
 *
 * In the upstream Ansible Portal, the user's AAP token flows through the
 * scaffolder via AAPTokenField. For our REST API, the frontend passes it
 * as the `x-aap-token` header. When the auth-backend-module-rhaap-provider
 * is integrated in production, this token is the user's Gateway OAuth2
 * access token — AAP RBAC is then enforced per-user.
 *
 * Returns undefined when no token is present (the backend falls back to
 * the service token from app-config.yaml).
 */
function getUserAapToken(req: express.Request): string | undefined {
  const header = req.headers['x-aap-token'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return undefined;
}

// ─── Validation helpers ────────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}

function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean';
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, service, database } = options;
  const router = Router();
  router.use(express.json());

  // ─── Health ─────────────────────────────────────────────────────────

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      dataSource: service.getDataSource(),
    });
  });

  // ─── Profiles ───────────────────────────────────────────────────────

  router.get('/profiles', async (_req, res) => {
    const profiles = await service.getProfiles();
    res.json(profiles);
  });

  // ─── Inventories ────────────────────────────────────────────────────

  router.get('/inventories', async (req, res) => {
    const userToken = getUserAapToken(req);
    const inventories = await service.getInventories(userToken);
    res.json(inventories);
  });

  // ─── Workflow job templates ─────────────────────────────────────────

  router.get('/workflow-templates', async (req, res) => {
    const userToken = getUserAapToken(req);
    const nameFilter = req.query.name as string | undefined;
    const templates = await service.getWorkflowTemplates(nameFilter, userToken);
    res.json(templates);
  });

  // ─── Scan ───────────────────────────────────────────────────────────

  router.post('/scan', async (req, res) => {
    const body = req.body;
    const userToken = getUserAapToken(req);

    // Validate required fields
    if (!isNonEmptyString(body.profileId)) {
      res.status(400).json({ error: 'profileId is required and must be a non-empty string' });
      return;
    }
    if (!isPositiveInteger(body.inventoryId)) {
      res.status(400).json({ error: 'inventoryId is required and must be a positive integer' });
      return;
    }
    if (body.workflowTemplateId !== undefined && body.workflowTemplateId !== null && !isPositiveInteger(body.workflowTemplateId)) {
      res.status(400).json({ error: 'workflowTemplateId must be a positive integer when provided' });
      return;
    }

    const scanRequest: LaunchScanRequest = {
      profileId: body.profileId,
      inventoryId: body.inventoryId,
      evaluateOnly: body.evaluateOnly ?? true,
      limit: body.limit,
    };

    logger.info(`Launching scan for profile=${scanRequest.profileId}`);

    try {
      const result = await service.launchScan(scanRequest, userToken);

      // Persist the scan record
      await database.createScan({
        profileId: scanRequest.profileId,
        inventoryId: scanRequest.inventoryId,
        scanner: 'oscap',
        workflowJobId: result.workflowJobId,
        status: 'pending',
        startedAt: new Date().toISOString(),
        completedAt: null,
      });

      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to launch scan: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Findings ───────────────────────────────────────────────────────

  router.get('/findings', async (req, res) => {
    const scanId = req.query.scanId as string | undefined;

    // If a scanId is given and we have DB records, use the database
    if (scanId) {
      const dbFindings = await database.getFindingsByScanId(scanId);
      if (dbFindings.length > 0) {
        res.json(dbFindings);
        return;
      }
    }

    // Otherwise fall through to the service (mock data)
    const findings = await service.getFindings(scanId);
    res.json(findings);
  });

  // ─── Workflow job status (for polling) ──────────────────────────────

  router.get('/workflow-status/:jobId', async (req, res) => {
    const userToken = getUserAapToken(req);
    const jobId = Number(req.params.jobId);
    if (Number.isNaN(jobId)) {
      res.status(400).json({ error: 'jobId must be a number' });
      return;
    }
    try {
      const status = await service.getWorkflowJobStatus(jobId, userToken);
      res.json(status);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Workflow nodes ─────────────────────────────────────────────────

  router.get('/workflow-nodes/:jobId', async (req, res) => {
    const userToken = getUserAapToken(req);
    const jobId = Number(req.params.jobId);
    if (Number.isNaN(jobId)) {
      res.status(400).json({ error: 'jobId must be a number' });
      return;
    }
    try {
      const nodes = await service.getWorkflowNodes(jobId, userToken);
      res.json(nodes);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Job events ─────────────────────────────────────────────────────

  router.get('/job-events/:jobId', async (req, res) => {
    const userToken = getUserAapToken(req);
    const jobId = Number(req.params.jobId);
    if (Number.isNaN(jobId)) {
      res.status(400).json({ error: 'jobId must be a number' });
      return;
    }
    try {
      const events = await service.getJobEvents(jobId, userToken);
      res.json(events);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Remediation ────────────────────────────────────────────────────

  router.post('/remediate', async (req, res) => {
    const body = req.body;
    const userToken = getUserAapToken(req);

    // Validate required fields
    if (!isNonEmptyString(body.profileId)) {
      res.status(400).json({ error: 'profileId is required and must be a non-empty string' });
      return;
    }
    if (!isPositiveInteger(body.inventoryId)) {
      res.status(400).json({ error: 'inventoryId is required and must be a positive integer' });
      return;
    }
    if (!isArray(body.selections)) {
      res.status(400).json({ error: 'selections is required and must be an array' });
      return;
    }

    // Validate each selection
    for (let i = 0; i < body.selections.length; i++) {
      const sel = body.selections[i];
      if (!isNonEmptyString(sel?.ruleId)) {
        res.status(400).json({ error: `selections[${i}].ruleId is required and must be a non-empty string` });
        return;
      }
      if (!isBoolean(sel?.enabled)) {
        res.status(400).json({ error: `selections[${i}].enabled is required and must be a boolean` });
        return;
      }
    }

    const remediateRequest: LaunchRemediationRequest = {
      profileId: body.profileId,
      inventoryId: body.inventoryId,
      selections: body.selections,
      limit: body.limit,
    };

    logger.info(`Launching remediation for profile=${remediateRequest.profileId}`);

    try {
      // Build an optimized remediation plan from the selections
      const plan = service.buildRemediationPlan(remediateRequest.selections);
      logger.info(
        `Remediation plan: ${plan.groups.length} groups, ${plan.totalRules} rules, ${plan.totalHosts} hosts`,
      );

      const result = await service.launchRemediation(remediateRequest, userToken);
      res.json({ ...result, plan });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to launch remediation: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Dashboard stats ───────────────────────────────────────────────

  router.get('/dashboard', async (_req, res) => {
    const stats = await service.getDashboardStats();
    res.json(stats);
  });

  // ─── Posture history ────────────────────────────────────────────────

  router.get('/posture', async (req, res) => {
    const profileId = req.query.profileId as string | undefined;
    const days = req.query.days ? Number(req.query.days) : 30;
    const history = await service.getPostureHistory(profileId, days);
    res.json(history);
  });

  // ─── Remediations (saved rule selections) ──────────────────────────

  router.get('/remediation-profiles', async (_req, res) => {
    const profiles = await service.getRemediationProfiles();
    res.json(profiles);
  });

  router.post('/remediation-profiles', async (req, res) => {
    const body = req.body;

    // Validate required fields
    if (!isNonEmptyString(body.name)) {
      res.status(400).json({ error: 'name is required and must be a non-empty string' });
      return;
    }
    if (!isArray(body.selections)) {
      res.status(400).json({ error: 'selections is required and must be an array' });
      return;
    }

    const saveRequest: SaveRemediationProfileRequest = {
      name: body.name,
      description: body.description ?? '',
      complianceProfileId: body.complianceProfileId ?? '',
      selections: body.selections,
    };

    try {
      const profile = await service.saveRemediationProfile(saveRequest);
      res.status(201).json(profile);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to save remediation: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Compliance profile registry ────────────────────────────────────

  router.get('/cartridges', async (_req, res) => {
    const cartridges = await database.listCartridges();
    res.json(cartridges);
  });

  router.post('/cartridges', async (req, res) => {
    const body = req.body;

    // Validate required fields
    if (!isNonEmptyString(body.displayName)) {
      res.status(400).json({ error: 'displayName is required and must be a non-empty string' });
      return;
    }
    if (!isNonEmptyString(body.framework)) {
      res.status(400).json({ error: 'framework is required and must be a non-empty string' });
      return;
    }
    if (body.workflowTemplateId !== undefined && body.workflowTemplateId !== null && !isPositiveInteger(body.workflowTemplateId)) {
      res.status(400).json({ error: 'workflowTemplateId must be a positive integer when provided' });
      return;
    }

    const saveRequest: SaveCartridgeRequest = {
      id: body.id,
      displayName: body.displayName,
      description: body.description ?? '',
      framework: body.framework,
      version: body.version ?? '',
      platform: body.platform ?? '',
      workflowTemplateId: body.workflowTemplateId ?? null,
      eeId: body.eeId ?? null,
      remediationPlaybookPath: body.remediationPlaybookPath ?? '',
      scanTags: body.scanTags ?? '',
    };

    try {
      const cartridge = await database.saveCartridge(saveRequest);
      res.status(201).json(cartridge);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to save compliance profile: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  router.delete('/cartridges/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const deleted = await database.deleteCartridge(id);
      if (!deleted) {
        res.status(404).json({ error: 'Compliance profile not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to delete compliance profile: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Controller resource lookups (for compliance profile settings) ──

  router.get('/controller/workflow-job-templates', async (req, res) => {
    const userToken = getUserAapToken(req);
    try {
      const templates = await service.getWorkflowTemplates(undefined, userToken);
      res.json(templates);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  router.get('/controller/execution-environments', async (req, res) => {
    const userToken = getUserAapToken(req);
    try {
      const ees = await service.getExecutionEnvironments(userToken);
      res.json(ees);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
