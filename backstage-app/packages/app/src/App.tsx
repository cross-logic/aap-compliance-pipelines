import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { createApp } from '@backstage/app-defaults';
import { CompliancePage } from '@aap-compliance/plugin-compliance';

const app = createApp({
  bindRoutes() {},
});

const routes = (
  <Routes>
    <Route path="/compliance/*" element={<CompliancePage />} />
    <Route path="/" element={<Navigate to="/compliance" replace />} />
  </Routes>
);

export default app.createRoot(routes);
