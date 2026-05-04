import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InfoCard,
  Progress,
  StatusOK,
  StatusError,
  StatusWarning,
  StatusPending,
  StatusRunning,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  makeStyles,
} from '@material-ui/core';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import SearchIcon from '@material-ui/icons/Search';
import { complianceApiRef } from '../../api';
import type { ComplianceScan } from '@aap-compliance/common';

const useStyles = makeStyles(theme => ({
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  clickableRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  statusChip: {
    fontWeight: 600,
    minWidth: 90,
  },
}));

const statusColor: Record<string, 'primary' | 'secondary' | 'default'> = {
  completed: 'primary',
  failed: 'secondary',
  running: 'default',
  pending: 'default',
  cancelled: 'default',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <StatusOK />;
    case 'failed': return <StatusError />;
    case 'running': return <StatusRunning />;
    case 'pending': return <StatusPending />;
    case 'cancelled': return <StatusWarning />;
    default: return <StatusPending />;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const ScanHistory = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const [scans, setScans] = useState<ComplianceScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getScans()
      .then(data => setScans(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <Progress />;

  return (
    <InfoCard title="Scan History">
      <div className={classes.headerRow}>
        <Typography variant="body2" color="textSecondary">
          All compliance scans run from this portal. Click a scan to view its findings.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayCircleFilledIcon />}
          onClick={() => navigate('/compliance/scan')}
        >
          New Scan
        </Button>
      </div>

      {scans.length === 0 ? (
        <div className={classes.emptyState}>
          <SearchIcon style={{ fontSize: 64, color: '#6A6E73', marginBottom: 16 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No scans yet
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Launch a compliance scan to see results here. Each scan evaluates
            your infrastructure against a compliance profile and produces
            per-host findings.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/compliance/scan')}
          >
            Launch a Scan
          </Button>
        </div>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Profile</TableCell>
                <TableCell>Scanner</TableCell>
                <TableCell>Workflow Job</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scans.map(scan => (
                <TableRow
                  key={scan.id}
                  className={classes.clickableRow}
                  onClick={() => {
                    const jobId = scan.workflowJobId ?? scan.id;
                    navigate(`/compliance/results/${jobId}`);
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                      <StatusIcon status={scan.status} />
                      <Chip
                        label={scan.status}
                        size="small"
                        color={statusColor[scan.status] ?? 'default'}
                        variant="outlined"
                        className={classes.statusChip}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" style={{ fontWeight: 500 }}>
                      {scan.profileId}
                    </Typography>
                  </TableCell>
                  <TableCell>{scan.scanner}</TableCell>
                  <TableCell>
                    {scan.workflowJobId ? `#${scan.workflowJobId}` : '--'}
                  </TableCell>
                  <TableCell>{formatDate(scan.startedAt)}</TableCell>
                  <TableCell>
                    {scan.completedAt ? formatDate(scan.completedAt) : '--'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </InfoCard>
  );
};
