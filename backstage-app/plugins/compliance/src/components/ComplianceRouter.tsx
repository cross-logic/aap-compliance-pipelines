import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ComplianceDashboard } from './ComplianceDashboard';
import { ProfileBrowser } from './ProfileBrowser';
import { ScanLauncher } from './ScanLauncher';
import { ResultsViewer } from './ResultsViewer';
import { RemediationProfileBuilder } from './RemediationProfileBuilder';
import { RemediationExecution } from './RemediationExecution';

export const ComplianceRouter = () => (
  <Routes>
    <Route path="/" element={<ComplianceDashboard />} />
    <Route path="/profiles/:profileId" element={<ProfileBrowser />} />
    <Route path="/scan" element={<ScanLauncher />} />
    <Route path="/results/:jobId" element={<ResultsViewer />} />
    <Route path="/remediation/:jobId" element={<RemediationProfileBuilder />} />
    <Route path="/execute/:jobId" element={<RemediationExecution />} />
  </Routes>
);
