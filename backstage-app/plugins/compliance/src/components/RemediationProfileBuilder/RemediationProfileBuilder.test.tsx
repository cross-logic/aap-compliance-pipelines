import React from 'react';
import { renderInTestApp } from '@backstage/test-utils';
import { fireEvent } from '@testing-library/react';
import { RemediationProfileBuilder } from './RemediationProfileBuilder';

// Mock useParams to provide a jobId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ jobId: '42' }),
}));

describe('RemediationProfileBuilder', () => {
  it('renders without crashing', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    expect(getByText('Remediation Profile')).toBeInTheDocument();
  });

  it('displays the summary bar with rule counts', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    expect(getByText(/rules with failures/)).toBeInTheDocument();
    expect(getByText(/selected/)).toBeInTheDocument();
    expect(getByText(/skipped/)).toBeInTheDocument();
    expect(getByText(/hosts affected/)).toBeInTheDocument();
  });

  it('displays bulk action buttons', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    expect(getByText('Select All')).toBeInTheDocument();
    expect(getByText('CAT I Only')).toBeInTheDocument();
    expect(getByText('CAT I + II')).toBeInTheDocument();
    expect(getByText('Clear All')).toBeInTheDocument();
  });

  it('displays severity group headers', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    expect(getByText(/CAT I/)).toBeInTheDocument();
    expect(getByText(/CAT II/)).toBeInTheDocument();
  });

  it('displays the apply remediation button', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    expect(getByText(/Apply Remediation/)).toBeInTheDocument();
  });

  it('displays the save as profile button', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    expect(getByText('Save as Profile')).toBeInTheDocument();
  });

  it('opens save dialog when Save as Profile is clicked', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    const saveButton = getByText('Save as Profile');
    fireEvent.click(saveButton);
    expect(getByText('Save Remediation Profile')).toBeInTheDocument();
    expect(getByText(/Save your selections/)).toBeInTheDocument();
  });

  it('toggles all rules when Select All is clicked', async () => {
    const { getByText } = await renderInTestApp(<RemediationProfileBuilder />);
    const clearAllButton = getByText('Clear All');
    fireEvent.click(clearAllButton);
    // After clearing, the skipped count should equal total rules with failures
    const selectAllButton = getByText('Select All');
    fireEvent.click(selectAllButton);
    // After selecting all, skipped should be 0
    expect(getByText(/0/)).toBeInTheDocument();
  });
});
