/**
 * Backend plugin registration for the compliance plugin.
 *
 * Registers:
 *   - Database migrations (Knex)
 *   - ComplianceService (mock/live toggle)
 *   - REST router at /api/compliance/*
 */
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';

import { ComplianceService } from './service/ComplianceService';
import { ComplianceDatabase } from './database/ComplianceDatabase';
import { createRouter } from './router';

export const complianceBackendPlugin = createBackendPlugin({
  pluginId: 'compliance',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
      },
      async init({ logger, config, httpRouter, database }) {
        logger.info('Initializing compliance backend plugin');

        // ─── Database ───────────────────────────────────────────
        const dbClient = await database.getClient();

        // Run migrations
        const migrationsDir = require('path').resolve(
          __dirname,
          'database',
          'migrations',
        );
        await dbClient.migrate.latest({
          directory: migrationsDir,
          tableName: 'compliance_knex_migrations',
        });
        logger.info('Compliance database migrations applied');

        const complianceDb = new ComplianceDatabase(dbClient);

        // ─── Service ────────────────────────────────────────────
        const service = new ComplianceService(config, logger);
        logger.info(
          `Compliance service ready (dataSource=${service.getDataSource()})`,
        );

        // ─── Router ─────────────────────────────────────────────
        const router = await createRouter({
          logger,
          service,
          database: complianceDb,
        });

        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
