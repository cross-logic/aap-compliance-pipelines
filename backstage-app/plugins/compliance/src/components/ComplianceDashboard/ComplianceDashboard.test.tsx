import React from 'react';
import { renderInTestApp } from '@backstage/test-utils';
import { ComplianceDashboard } from './ComplianceDashboard';

describe('ComplianceDashboard', () => {
  it('renders without crashing', async () => {
    const { getByText } = await renderInTestApp(<ComplianceDashboard />);
    expect(getByText('Compliance Posture')).toBeInTheDocument();
  });

  it('displays key metric cards', async () => {
    const { getByText } = await renderInTestApp(<ComplianceDashboard />);
    expect(getByText('Hosts Scanned')).toBeInTheDocument();
    expect(getByText('Critical (CAT I)')).toBeInTheDocument();
    expect(getByText('Pending Remediation')).toBeInTheDocument();
    expect(getByText('Active Profiles')).toBeInTheDocument();
  });

  it('displays quick action buttons', async () => {
    const { getByText } = await renderInTestApp(<ComplianceDashboard />);
    expect(getByText('New Scan')).toBeInTheDocument();
    expect(getByText('Browse Profiles')).toBeInTheDocument();
  });

  it('displays recent scans section', async () => {
    const { getByText } = await renderInTestApp(<ComplianceDashboard />);
    expect(getByText('Recent Scans')).toBeInTheDocument();
    expect(getByText('RHEL 9 STIG V2R8')).toBeInTheDocument();
  });

  it('displays active compliance profiles', async () => {
    const { getByText } = await renderInTestApp(<ComplianceDashboard />);
    expect(getByText('Active Compliance Profiles')).toBeInTheDocument();
    expect(getByText('DISA STIG V2R8')).toBeInTheDocument();
    expect(getByText('CIS Benchmark L1')).toBeInTheDocument();
    expect(getByText('PCI-DSS v4.0')).toBeInTheDocument();
  });

  it('displays compliance gauge labels', async () => {
    const { getByText } = await renderInTestApp(<ComplianceDashboard />);
    expect(getByText('Overall')).toBeInTheDocument();
    expect(getByText('DISA STIG')).toBeInTheDocument();
    expect(getByText('CIS L1')).toBeInTheDocument();
    expect(getByText('PCI-DSS')).toBeInTheDocument();
  });
});
