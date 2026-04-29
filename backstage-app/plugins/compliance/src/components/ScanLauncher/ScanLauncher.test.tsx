import React from 'react';
import { renderInTestApp } from '@backstage/test-utils';
import { fireEvent } from '@testing-library/react';
import { ScanLauncher } from './ScanLauncher';

describe('ScanLauncher', () => {
  it('renders without crashing', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    expect(getByText('New Scan')).toBeInTheDocument();
  });

  it('displays the stepper with all steps', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    expect(getByText('Select Profile')).toBeInTheDocument();
    expect(getByText('Select Targets')).toBeInTheDocument();
    expect(getByText('Review & Launch')).toBeInTheDocument();
  });

  it('displays compliance profile options', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    expect(getByText('DISA STIG for RHEL 9')).toBeInTheDocument();
    expect(getByText('CIS Benchmark RHEL 9 — Level 1')).toBeInTheDocument();
    expect(getByText('PCI-DSS v4.0 for RHEL 9')).toBeInTheDocument();
  });

  it('displays rule counts for each profile', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    expect(getByText('366 rules')).toBeInTheDocument();
    expect(getByText('189 rules')).toBeInTheDocument();
    expect(getByText('142 rules')).toBeInTheDocument();
  });

  it('disables Next button when no profile is selected', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    const nextButton = getByText('Next');
    expect(nextButton.closest('button')).toBeDisabled();
  });

  it('enables Next button after selecting a profile', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    const profileCard = getByText('DISA STIG for RHEL 9');
    fireEvent.click(profileCard);
    const nextButton = getByText('Next');
    expect(nextButton.closest('button')).not.toBeDisabled();
  });

  it('navigates to step 2 when Next is clicked after profile selection', async () => {
    const { getByText } = await renderInTestApp(<ScanLauncher />);
    fireEvent.click(getByText('DISA STIG for RHEL 9'));
    fireEvent.click(getByText('Next'));
    expect(getByText('Select target hosts to scan')).toBeInTheDocument();
    expect(getByText('Evaluate only (recommended)')).toBeInTheDocument();
  });
});
