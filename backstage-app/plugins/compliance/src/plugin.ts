import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { complianceApiRef } from './api/complianceApiRef';
import { ComplianceBackendClient } from './api/ComplianceBackendClient';

export const compliancePlugin = createPlugin({
  id: 'compliance',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: complianceApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new ComplianceBackendClient({ discoveryApi, fetchApi }),
    }),
  ],
});

export const CompliancePage = compliancePlugin.provide(
  createRoutableExtension({
    name: 'CompliancePage',
    component: () =>
      import('./components/ComplianceRouter').then(m => m.ComplianceRouter),
    mountPoint: rootRouteRef,
  }),
);
