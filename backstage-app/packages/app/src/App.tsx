import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay } from '@backstage/core-components';
import { CompliancePage } from '@aap-compliance/plugin-compliance';

const app = createApp({
  bindRoutes() {},
});

const routes = (
  <FlatRoutes>
    <Route path="/compliance/*" element={<CompliancePage />} />
    <Route path="/" element={<Navigate to="/compliance" replace />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <AppRouter>{routes}</AppRouter>
  </>,
);
