import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Page,
  Header,
  HeaderTabs,
  Content,
} from '@backstage/core-components';
import { ComplianceDashboard } from './ComplianceDashboard';
import { ProfileBrowser } from './ProfileBrowser';
import { ScanLauncher } from './ScanLauncher';
import { ResultsViewer } from './ResultsViewer';
import { RemediationProfileBuilder } from './RemediationProfileBuilder';
import { RemediationExecution } from './RemediationExecution';
import { CartridgeSettings } from './CartridgeSettings';
import { RemediationsList } from './RemediationsList';
import { ScanHistory } from './ScanHistory';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'scan', label: 'New Scan' },
  { id: 'results', label: 'Results' },
  { id: 'remediations', label: 'Remediations' },
  { id: 'settings', label: 'Settings' },
];

const tabRouteMap: Record<string, string> = {
  overview: '',
  profiles: 'profiles/all',
  scan: 'scan',
  results: 'results',
  remediations: 'remediations',
  settings: 'settings',
};

const ComplianceRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedTab = () => {
    const path = location.pathname.replace(/^\/compliance\/?/, '');
    if (path.startsWith('profiles')) return 1;
    if (path.startsWith('scan')) return 2;
    if (path.startsWith('results') || path.startsWith('remediation/') || path.startsWith('execute')) return 3;
    if (path === 'remediations') return 4;
    if (path.startsWith('settings')) return 5;
    return 0;
  };

  const [selectedTab, setSelectedTab] = useState(getSelectedTab());

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    const tab = TABS[index];
    navigate(tabRouteMap[tab.id] || '');
  };

  return (
    <Page themeId="app">
      <Header
        title="Compliance"
        subtitle="Scan, review, and remediate infrastructure compliance"
        style={{ background: 'inherit' }}
      />
      <HeaderTabs
        selectedIndex={selectedTab}
        onChange={handleTabChange}
        tabs={TABS}
      />
      <Content>
        <Routes>
          <Route path="/" element={<ComplianceDashboard />} />
          <Route path="/profiles/:profileId" element={<ProfileBrowser />} />
          <Route path="/scan" element={<ScanLauncher />} />
          <Route path="/results" element={<ScanHistory />} />
          <Route path="/results/:jobId" element={<ResultsViewer />} />
          <Route path="/remediation/:jobId" element={<RemediationProfileBuilder />} />
          <Route path="/execute/:jobId" element={<RemediationExecution />} />
          <Route path="/remediations" element={<RemediationsList />} />
          <Route path="/settings" element={<CartridgeSettings />} />
        </Routes>
      </Content>
    </Page>
  );
};

export { ComplianceRouter };
