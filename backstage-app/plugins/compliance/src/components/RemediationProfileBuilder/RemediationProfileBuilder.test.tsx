import React from 'react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { RemediationProfileBuilder } from './RemediationProfileBuilder';
import { complianceApiRef } from '../../api';
import { createMockComplianceApi } from '../../__testutils__/mockComplianceApi';
import type { ComplianceApi } from '../../api';

// Mock useParams to provide a jobId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ jobId: '42' }),
}));

// Mock usePermission to allow remediation actions
jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: () => ({ allowed: true, loading: false }),
}));

describe('RemediationProfileBuilder', () => {
  let mockApi: jest.Mocked<ComplianceApi>;

  beforeEach(() => {
    mockApi = createMockComplianceApi();
  });

  const renderBuilder = () =>
    renderInTestApp(
      <TestApiProvider apis={[[complianceApiRef, mockApi]]}>
        <RemediationProfileBuilder />
      </TestApiProvider>,
    );

  it('renders breadcrumb with Remediation label', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText('Remediation')).toBeInTheDocument();
    });
  });

  it('displays the summary bar with rule counts', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText(/rules with failures/)).toBeInTheDocument();
    });
    expect(screen.getByText(/selected/)).toBeInTheDocument();
    expect(screen.getByText(/skipped/)).toBeInTheDocument();
    expect(screen.getByText(/hosts affected/)).toBeInTheDocument();
  });

  it('displays bulk action buttons', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
    expect(screen.getByText('CAT I Only')).toBeInTheDocument();
    expect(screen.getByText('CAT I + II')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('displays severity group headers', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText(/CAT I/)).toBeInTheDocument();
    });
    expect(screen.getByText(/CAT II/)).toBeInTheDocument();
  });

  it('displays the apply remediation button', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText(/Apply Remediation/)).toBeInTheDocument();
    });
  });

  it('displays the save remediation button', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText('Save Remediation')).toBeInTheDocument();
    });
  });

  it('opens save dialog when Save Remediation is clicked', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText('Save Remediation')).toBeInTheDocument();
    });
    const saveButton = screen.getAllByText('Save Remediation')[0];
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/Save your rule selections/)).toBeInTheDocument();
    });
  });

  it('toggles all rules when Select All / Clear All are clicked', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Clear All'));
    await waitFor(() => {
      // After clearing, the "selected" count should show 0
      expect(screen.getByText(/\b0\b/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Select All'));
    // After selecting all, the count should match number of failed findings
    await waitFor(() => {
      expect(screen.getByText(/\b2\b/)).toBeInTheDocument();
    });
  });

  it('calls getFindings with the jobId from route params', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(mockApi.getFindings).toHaveBeenCalledWith('42');
    });
  });
});
