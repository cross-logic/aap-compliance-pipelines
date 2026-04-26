import React, { PropsWithChildren } from 'react';
import { Navigate, Route, Link as RouterLink } from 'react-router-dom';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import {
  AlertDisplay,
  Sidebar,
  sidebarConfig,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarScrollWrapper,
  SidebarSpace,
  useSidebarOpenState,
  Link,
} from '@backstage/core-components';
import { getThemes } from '@red-hat-developer-hub/backstage-plugin-theme';
import { makeStyles } from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';
import DashboardIcon from '@material-ui/icons/Dashboard';
import SecurityIcon from '@material-ui/icons/Security';
import AssessmentIcon from '@material-ui/icons/Assessment';
import BuildIcon from '@material-ui/icons/Build';
import SettingsIcon from '@material-ui/icons/Settings';

import { CompliancePage } from '@aap-compliance/plugin-compliance';

const app = createApp({
  bindRoutes() {},
  themes: getThemes(),
});

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
  svg: {
    width: 'auto',
    height: 28,
  },
  path: {
    fill: '#7df3e1',
  },
});

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="Home">
        <svg
          className={classes.svg}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={isOpen ? '0 0 2079.95 456.05' : '0 0 337.46 428.5'}
        >
          <path
            className={classes.path}
            d={isOpen
              ? 'M302.9,180a80.62,80.62,0,0,0,13.44-10.37c.8-.77,1.55-1.54,2.31-2.31a81.89,81.89,0,0,0,7.92-9.37,62.37,62.37,0,0,0,6.27-10.77,48.6,48.6,0,0,0,4.36-16.4c1.49-19.39-10-38.67-35.62-54.22L198.42,14,78.16,129.22l-78.29,75,108.6,65.9a111.6,111.6,0,0,0,57.76,16.42c24.92,0,48.8-8.8,66.42-25.69,19.16-18.36,25.52-42.12,13.7-61.87a49.69,49.69,0,0,0-6.8-8.87,89.78,89.78,0,0,0,19.28,2.15H259a85.09,85.09,0,0,0,31-5.79A80.88,80.88,0,0,0,302.9,180Z'
              : 'M303,166.05a80.69,80.69,0,0,0,13.45-10.37c.79-.77,1.55-1.53,2.3-2.3a83.12,83.12,0,0,0,7.93-9.38A63.69,63.69,0,0,0,333,133.23a48.58,48.58,0,0,0,4.35-16.4c1.49-19.39-10-38.67-35.62-54.22L198.56,0,78.3,115.23,0,190.25l108.6,65.91a111.59,111.59,0,0,0,57.76,16.41c24.92,0,48.8-8.8,66.42-25.69,19.16-18.36,25.52-42.12,13.7-61.87a49.22,49.22,0,0,0-6.8-8.87A89.17,89.17,0,0,0,259,178.29h.15a85.08,85.08,0,0,0,31-5.79A80.88,80.88,0,0,0,303,166.05Z'
            }
          />
        </svg>
      </Link>
    </div>
  );
};

const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem icon={DashboardIcon} to="/compliance" text="Dashboard" />
        <SidebarItem icon={SecurityIcon} to="/compliance/profiles/all" text="Profiles" />
        <SidebarItem icon={AssessmentIcon} to="/compliance/scan" text="New Scan" />
        <SidebarItem icon={BuildIcon} to="/compliance/results/42" text="Results" />
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup label="Settings" icon={<SettingsIcon />} to="/settings">
        <SidebarItem icon={SettingsIcon} to="/settings" text="Settings" />
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
