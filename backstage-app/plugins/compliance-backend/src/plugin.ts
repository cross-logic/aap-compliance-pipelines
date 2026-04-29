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

        // AUTH POLICY: Unauthenticated access for the prototype phase.
        //
        // In production RHDH, this would be removed — the Backstage framework's
        // httpAuth service handles authentication automatically when the
        // auth-backend-module-rhaap-provider is installed. The upstream Ansible
        // Portal plugins do NOT add explicit auth middleware; they rely on:
        //
        //   1. httpRouter's built-in Backstage JWT validation
        //   2. The RBAC backend plugin (@backstage-community/plugin-rbac-backend)
        //      evaluating permissions for plugins listed in pluginsWithPermission
        //   3. Frontend fetchApi auto-attaching identity tokens
        //
        // To enable auth in production:
        //   - Install auth-backend-module-rhaap-provider for AAP Gateway OAuth2
        //   - Remove this addAuthPolicy call (let httpRouter enforce auth)
        //   - Add 'compliance' to permission.rbac.pluginsWithPermission in app-config
        //   - Frontend already passes x-aap-token header (see ComplianceBackendClient)
        //
        // The per-request AAP token infrastructure is already wired through
        // getUserAapToken() in router.ts and the token parameter on all
        // ControllerClient/ComplianceService methods.
        httpRouter.addAuthPolicy({
          path: '/',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
