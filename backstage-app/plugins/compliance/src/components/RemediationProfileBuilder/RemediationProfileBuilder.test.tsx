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
    // "selected" and "skipped" text appear in summary bar and per-group headers
    expect(screen.getAllByText(/selected/).length).toBeGreaterThanOrEqual(1);
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
    // The severity group headers use the long labels: "CAT I — Critical", etc.
    await waitFor(() => {
      expect(screen.getByText('CAT I — Critical')).toBeInTheDocument();
    });
    expect(screen.getByText('CAT II — Medium')).toBeInTheDocument();
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

    // After Clear All, the skipped count should match total failed findings
    fireEvent.click(screen.getByText('Clear All'));
    await waitFor(() => {
      expect(screen.getByText(/skipped/)).toHaveTextContent('2');
    });

    // After Select All, the skipped count should be 0
    fireEvent.click(screen.getByText('Select All'));
    await waitFor(() => {
      expect(screen.getByText(/skipped/)).toHaveTextContent('0');
    });
  });

  it('calls getFindings with the jobId from route params', async () => {
    await renderBuilder();
    await waitFor(() => {
      expect(mockApi.getFindings).toHaveBeenCalledWith('42');
    });
  });
});
