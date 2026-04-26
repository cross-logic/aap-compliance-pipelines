import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import {
  AlertDisplay,
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarSpace,
} from '@backstage/core-components';
import { getThemes } from '@red-hat-developer-hub/backstage-plugin-theme';
import SecurityIcon from '@material-ui/icons/Security';
import DashboardIcon from '@material-ui/icons/Dashboard';
import AssessmentIcon from '@material-ui/icons/Assessment';
import BuildIcon from '@material-ui/icons/Build';
import SettingsIcon from '@material-ui/icons/Settings';
import MenuIcon from '@material-ui/icons/Menu';

import { CompliancePage } from '@aap-compliance/plugin-compliance';

const app = createApp({
  bindRoutes() {},
  themes: getThemes(),
});

const SidebarLogo = () => (
  <div
    style={{
      padding: '24px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <SecurityIcon style={{ fontSize: 28, color: '#7df3e1' }} />
    <span
      style={{
        fontFamily: '"Red Hat Text", sans-serif',
        fontWeight: 700,
        fontSize: '1rem',
        color: 'inherit',
      }}
    >
      Compliance
    </span>
  </div>
);

const Root = ({ children }: { children: React.ReactNode }) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem
          icon={DashboardIcon}
          to="/compliance"
          text="Dashboard"
        />
        <SidebarItem
          icon={SecurityIcon}
          to="/compliance/profiles/all"
          text="Profiles"
        />
        <SidebarItem
          icon={AssessmentIcon}
          to="/compliance/scan"
          text="New Scan"
        />
        <SidebarItem
          icon={BuildIcon}
          to="/compliance/results/42"
          text="Results"
        />
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup label="Settings" icon={<SettingsIcon />}>
        <SidebarItem
          icon={SettingsIcon}
          to="/settings"
          text="Settings"
        />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);

const routes = (
  <FlatRoutes>
    <Route path="/compliance/*" element={<CompliancePage />} />
    <Route path="/" element={<Navigate to="/compliance" replace />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
