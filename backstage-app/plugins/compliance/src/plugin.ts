import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { complianceApiRef } from './api/complianceApiRef';
import { ComplianceBackendClient, setDiscoveryApi } from './api/ComplianceBackendClient';

export const compliancePlugin = createPlugin({
  id: 'compliance',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: complianceApiRef,
      deps: { discoveryApi: discoveryApiRef },
      factory: ({ discoveryApi }) => {
        setDiscoveryApi(discoveryApi);
        return new ComplianceBackendClient();
      },
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
