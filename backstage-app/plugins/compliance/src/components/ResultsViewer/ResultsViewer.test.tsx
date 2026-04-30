import React from 'react';
import { renderInTestApp } from '@backstage/test-utils';
import { ResultsViewer } from './ResultsViewer';

// Mock useParams to provide a jobId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ jobId: '42' }),
}));

describe('ResultsViewer', () => {
  it('renders without crashing', async () => {
    const { getByText } = await renderInTestApp(<ResultsViewer />);
    expect(getByText('Findings by Rule')).toBeInTheDocument();
  });

  it('displays summary cards', async () => {
    const { getByText } = await renderInTestApp(<ResultsViewer />);
    expect(getByText('Overall Compliance')).toBeInTheDocument();
    expect(getByText('Hosts Scanned')).toBeInTheDocument();
    expect(getByText('Rules Evaluated')).toBeInTheDocument();
    expect(getByText('Rules with Failures')).toBeInTheDocument();
  });

  it('displays the build remediation button', async () => {
    const { getByText } = await renderInTestApp(<ResultsViewer />);
    const button = getByText(/Build Remediation/);
    expect(button).toBeInTheDocument();
  });

  it('displays finding table headers', async () => {
    const { getByText } = await renderInTestApp(<ResultsViewer />);
    expect(getByText('Severity')).toBeInTheDocument();
    expect(getByText('STIG ID')).toBeInTheDocument();
    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Hosts')).toBeInTheDocument();
    expect(getByText('Pass Rate')).toBeInTheDocument();
  });

  it('displays severity filter options', async () => {
    const { getByText } = await renderInTestApp(<ResultsViewer />);
    expect(getByText('Scan Results')).toBeInTheDocument();
  });

  it('displays findings from mock data', async () => {
    const { getByText } = await renderInTestApp(<ResultsViewer />);
    expect(getByText('Set SSH Client Alive Interval')).toBeInTheDocument();
    expect(getByText('V-257844')).toBeInTheDocument();
  });
});
