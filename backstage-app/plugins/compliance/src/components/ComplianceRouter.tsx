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

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'scan', label: 'New Scan' },
  { id: 'results', label: 'Results' },
];

const tabRouteMap: Record<string, string> = {
  overview: '',
  profiles: 'profiles/all',
  scan: 'scan',
  results: 'results/42',
};

const ComplianceRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedTab = () => {
    const path = location.pathname.replace(/^\/compliance\/?/, '');
    if (path.startsWith('profiles')) return 1;
    if (path.startsWith('scan')) return 2;
    if (path.startsWith('results') || path.startsWith('remediation') || path.startsWith('execute')) return 3;
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
          <Route path="/results/:jobId" element={<ResultsViewer />} />
          <Route path="/remediation/:jobId" element={<RemediationProfileBuilder />} />
          <Route path="/execute/:jobId" element={<RemediationExecution />} />
        </Routes>
      </Content>
    </Page>
  );
};

export { ComplianceRouter };
