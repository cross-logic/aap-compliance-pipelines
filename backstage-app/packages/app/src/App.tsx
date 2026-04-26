import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, CssBaseline } from '@backstage/core-components';
import { getThemes } from '@red-hat-developer-hub/backstage-plugin-theme';
import MuiCssBaseline from '@material-ui/core/CssBaseline';

import { CompliancePage } from '@aap-compliance/plugin-compliance';
import { Root } from './components/Root';
import { GlobalHeader } from './components/GlobalHeader';

const app = createApp({
  bindRoutes() {},
  themes: getThemes(),
});

const routes = (
  <FlatRoutes>
    <Route path="/compliance/*" element={<CompliancePage />} />
    <Route path="/" element={<Navigate to="/compliance" replace />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <MuiCssBaseline />
    <AlertDisplay />
    <AppRouter>
      <GlobalHeader />
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
