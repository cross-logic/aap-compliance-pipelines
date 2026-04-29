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

        // TODO(RBAC): Replace with authenticated policy once RBAC integration
        // is implemented. This is intentional for the prototype phase — all
        // routes are unauthenticated to allow demo/testing without an OAuth
        // provider configured. Production deployment requires:
        //   1. OAuth2 + PKCE auth via AAP Gateway (auth-backend-module-rhaap-provider)
        //   2. Backstage permissions framework integration for per-user RBAC
        //   3. User identity resolution from AAP OAuth session
        // See: architect-review-final.md B1, handbook Section 3 & 4.
        httpRouter.addAuthPolicy({
          path: '/',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
