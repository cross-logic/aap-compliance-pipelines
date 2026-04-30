/**
 * Express router for the compliance backend plugin.
 *
 * All routes are prefixed with /api/compliance by the plugin registration.
 */
import express from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { ComplianceService } from './service/ComplianceService';
import { ComplianceDatabase } from './database/ComplianceDatabase';
export interface RouterOptions {
    logger: LoggerService;
    service: ComplianceService;
    database: ComplianceDatabase;
}
export declare function createRouter(options: RouterOptions): Promise<express.Router>;
//# sourceMappingURL=router.d.ts.map