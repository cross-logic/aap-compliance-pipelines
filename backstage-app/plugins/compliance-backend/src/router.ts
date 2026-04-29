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

  router.get('/inventories', async (_req, res) => {
    const inventories = await service.getInventories();
    res.json(inventories);
  });

  // ─── Workflow templates ─────────────────────────────────────────────

  router.get('/workflow-templates', async (req, res) => {
    const nameFilter = req.query.name as string | undefined;
    const templates = await service.getWorkflowTemplates(nameFilter);
    res.json(templates);
  });

  // ─── Scan ───────────────────────────────────────────────────────────

  router.post('/scan', async (req, res) => {
    const body = req.body as LaunchScanRequest;
    logger.info(`Launching scan for profile=${body.profileId}`);

    try {
      const result = await service.launchScan(body);

      // Persist the scan record
      await database.createScan({
        profileId: body.profileId,
        inventoryId: body.inventoryId,
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
    const jobId = Number(req.params.jobId);
    if (Number.isNaN(jobId)) {
      res.status(400).json({ error: 'jobId must be a number' });
      return;
    }
    try {
      const status = await service.getWorkflowJobStatus(jobId);
      res.json(status);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Workflow nodes ─────────────────────────────────────────────────

  router.get('/workflow-nodes/:jobId', async (req, res) => {
    const jobId = Number(req.params.jobId);
    if (Number.isNaN(jobId)) {
      res.status(400).json({ error: 'jobId must be a number' });
      return;
    }
    try {
      const nodes = await service.getWorkflowNodes(jobId);
      res.json(nodes);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Job events ─────────────────────────────────────────────────────

  router.get('/job-events/:jobId', async (req, res) => {
    const jobId = Number(req.params.jobId);
    if (Number.isNaN(jobId)) {
      res.status(400).json({ error: 'jobId must be a number' });
      return;
    }
    try {
      const events = await service.getJobEvents(jobId);
      res.json(events);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Remediation ────────────────────────────────────────────────────

  router.post('/remediate', async (req, res) => {
    const body = req.body as LaunchRemediationRequest;
    logger.info(`Launching remediation for profile=${body.profileId}`);

    try {
      const result = await service.launchRemediation(body);
      res.json(result);
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

  // ─── Remediation profiles ──────────────────────────────────────────

  router.get('/remediation-profiles', async (_req, res) => {
    const profiles = await service.getRemediationProfiles();
    res.json(profiles);
  });

  router.post('/remediation-profiles', async (req, res) => {
    const body = req.body as SaveRemediationProfileRequest;
    if (!body.name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    try {
      const profile = await service.saveRemediationProfile(body);
      res.status(201).json(profile);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to save remediation profile: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Cartridge registry ─────────────────────────────────────────────

  router.get('/cartridges', async (_req, res) => {
    const cartridges = await database.listCartridges();
    res.json(cartridges);
  });

  router.post('/cartridges', async (req, res) => {
    const body = req.body as SaveCartridgeRequest;
    if (!body.displayName || !body.framework) {
      res.status(400).json({ error: 'displayName and framework are required' });
      return;
    }

    try {
      const cartridge = await database.saveCartridge(body);
      res.status(201).json(cartridge);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to save cartridge: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  router.delete('/cartridges/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const deleted = await database.deleteCartridge(id);
      if (!deleted) {
        res.status(404).json({ error: 'Cartridge not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to delete cartridge: ${msg}`);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Controller resource lookups (for cartridge settings UI) ───────

  router.get('/controller/workflow-job-templates', async (_req, res) => {
    try {
      const templates = await service.getWorkflowTemplates();
      res.json(templates);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  router.get('/controller/execution-environments', async (_req, res) => {
    try {
      const ees = await service.getExecutionEnvironments();
      res.json(ees);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
