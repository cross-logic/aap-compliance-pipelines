import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StatusRunning,
  StatusPending,
} from '@backstage/core-components';
import {
  Box,
  Typography,
  Chip,
  Paper,
  LinearProgress,
  makeStyles,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { complianceApiRef } from '../../api';
import type { ComplianceScan } from '@aap-compliance/common';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(0, 3),
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(1),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 200,
  },
  progressSection: {
    flex: 1,
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  elapsed: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    minWidth: 60,
    textAlign: 'right' as const,
  },
}));

/** Format seconds into human-readable elapsed time. */
function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function scanTypeLabel(scan: ComplianceScan): string {
  if (scan.scanType === 'verification') return 'Verification';
  return 'Assessment';
}

interface ActiveJob {
  scan: ComplianceScan;
  elapsed: number;
  startTime: number;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export const ActiveJobsBanner = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [visible, setVisible] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track tab visibility for polling pause
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Poll for active scans
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const scans = await api.getScans();
        if (cancelled) return;

        const cutoff = Date.now() - TWO_HOURS_MS;
        const active = scans.filter(
          s =>
            (s.status === 'pending' || s.status === 'running') &&
            new Date(s.startedAt).getTime() > cutoff,
        );

        setActiveJobs(
          active.map(scan => ({
            scan,
            elapsed: (Date.now() - new Date(scan.startedAt).getTime()) / 1000,
            startTime: new Date(scan.startedAt).getTime(),
          })),
        );
      } catch {
        // API not available — will retry on next poll
      }
    };

    poll();
    const interval = setInterval(poll, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [api, visible]);

  // Tick elapsed time every second for smooth display
  useEffect(() => {
    if (activeJobs.length === 0) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      setActiveJobs(prev =>
        prev.map(job => ({
          ...job,
          elapsed: (Date.now() - job.startTime) / 1000,
        })),
      );
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [activeJobs.length]);

  if (activeJobs.length === 0) return null;

  return (
    <Box className={classes.root}>
      {activeJobs.map(job => (
        <Paper
          key={job.scan.id}
          variant="outlined"
          className={classes.banner}
          onClick={() => {
            const id = job.scan.workflowJobId ?? job.scan.id;
            navigate(`/compliance/results/${id}`);
          }}
        >
          <Box className={classes.statusSection}>
            {job.scan.status === 'running' ? <StatusRunning /> : <StatusPending />}
            <Typography variant="body2" style={{ fontWeight: 500 }}>
              {scanTypeLabel(job.scan)}
            </Typography>
            <Chip
              size="small"
              label={job.scan.status === 'running' ? 'Running' : 'Pending'}
              color={job.scan.status === 'running' ? 'primary' : 'default'}
              variant="outlined"
            />
          </Box>

          <Box className={classes.progressSection}>
            {job.scan.status === 'running' && (
              <LinearProgress className={classes.progressBar} />
            )}
          </Box>

          <Typography variant="body2" className={classes.elapsed}>
            {formatElapsed(job.elapsed)}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};
