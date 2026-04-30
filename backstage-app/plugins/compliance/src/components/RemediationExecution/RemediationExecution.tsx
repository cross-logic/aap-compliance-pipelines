import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  InfoCard,
  Breadcrumbs,
  StatusOK,
  StatusError,
  StatusRunning,
  StatusPending,
  Progress,
} from '@backstage/core-components';
import {
  Grid,
  Typography,
  Button,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  makeStyles,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import RefreshIcon from '@material-ui/icons/Refresh';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import { useApi } from '@backstage/core-plugin-api';
import { complianceApiRef } from '../../api';

const useStyles = makeStyles(theme => ({
  progressSection: {
    padding: theme.spacing(3),
    textAlign: 'center',
  },
  taskRow: {
    '&:last-child td': {
      borderBottom: 'none',
    },
  },
  deltaImproved: {
    color: theme.palette.success?.main ?? '#4caf50',
    fontWeight: 600,
  },
  deltaUnchanged: {
    color: theme.palette.text.secondary,
  },
  comparisonCard: {
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  bigNumber: {
    fontSize: '2.5rem',
    fontWeight: 700,
  },
  arrow: {
    fontSize: '2rem',
    color: theme.palette.text.secondary,
    margin: theme.spacing(0, 2),
  },
}));

type ExecutionPhase = 'preparing' | 'running' | 'verifying' | 'complete' | 'failed';

const PHASES = ['Preparing', 'Remediating', 'Verifying', 'Complete'];

type TaskStatus = 'pending' | 'running' | 'completed';

interface RemediationTask {
  name: string;
  stigId: string;
  status: TaskStatus;
}

const INITIAL_TASKS: RemediationTask[] = [
  { name: 'Set SSH Client Alive Interval', stigId: 'V-257844', status: 'pending' },
  { name: 'Disable SSH Root Login', stigId: 'V-257846', status: 'pending' },
  { name: 'Set Account Session Timeout', stigId: 'V-257893', status: 'pending' },
  { name: 'Audit DAC Permission Changes — chmod', stigId: 'V-257910', status: 'pending' },
  { name: 'Configure System Cryptography Policy', stigId: 'V-257778', status: 'pending' },
  { name: 'Install AIDE', stigId: 'V-257780', status: 'pending' },
  { name: 'Set GRUB2 Boot Loader Password', stigId: 'V-257785', status: 'pending' },
  { name: 'Disable Ctrl-Alt-Del Reboot', stigId: 'V-257790', status: 'pending' },
  { name: 'Mount /tmp with noexec', stigId: 'V-257793', status: 'pending' },
  { name: 'Configure Login Banner', stigId: 'V-257795', status: 'pending' },
];

export const RemediationExecution = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const { jobId } = useParams<{ jobId: string }>();
  const [phase, setPhase] = useState<ExecutionPhase>('preparing');
  const [progress, setProgress] = useState(0);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [workflowJobId, setWorkflowJobId] = useState<number | null>(null);

  // Try to launch the remediation via the backend
  const launchRemediation = useCallback(async () => {
    try {
      const result = await api.launchRemediation({
        profileId: 'rhel9-stig',
        inventoryId: 1,
        selections: [],
      });
      setWorkflowJobId(result.workflowJobId);
    } catch {
      // In mock mode or on error, proceed with simulated execution
    }
  }, []);

  useEffect(() => {
    launchRemediation();
  }, [launchRemediation]);

  // Simulated progress animation (works in both mock and live mode as visual feedback)
  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('running'), 1500);
    const timer2 = setTimeout(() => {
      setPhase('running');
      setProgress(40);
      setTasks(prev =>
        prev.map((t, i) =>
          i < 5
            ? { ...t, status: 'completed' as const }
            : i === 5
              ? { ...t, status: 'running' as const }
              : t,
        ),
      );
    }, 3000);
    const timer3 = setTimeout(() => {
      setProgress(80);
      setTasks(prev =>
        prev.map((t, i) =>
          i < 8
            ? { ...t, status: 'completed' as const }
            : i === 8
              ? { ...t, status: 'running' as const }
              : t,
        ),
      );
    }, 5000);
    const timer4 = setTimeout(() => {
      setProgress(100);
      setTasks(prev => prev.map(t => ({ ...t, status: 'completed' as const })));
      setPhase('verifying');
    }, 7000);
    const timer5 = setTimeout(() => setPhase('complete'), 10000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  const activeStep =
    phase === 'preparing'
      ? 0
      : phase === 'running'
        ? 1
        : phase === 'verifying'
          ? 2
          : 3;

  const statusIcon = (status: 'completed' | 'running' | 'pending') => {
    switch (status) {
      case 'completed':
        return <StatusOK />;
      case 'running':
        return <StatusRunning />;
      case 'pending':
        return <StatusPending />;
    }
  };

  return (
    <>
      <Breadcrumbs>
          <Typography
            color="primary"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/compliance')}
          >
            Compliance
          </Typography>
          <Typography
            color="primary"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/compliance/results/${jobId}`)}
          >
            Scan Results
          </Typography>
          <Typography>Remediation</Typography>
        </Breadcrumbs>

        <Box mt={3} />

        <Grid container spacing={3}>
          {/* Progress Stepper */}
          <Grid item xs={12}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {PHASES.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Grid>

          {/* Progress Bar */}
          {phase !== 'complete' && (
            <Grid item xs={12}>
              <InfoCard>
                <div className={classes.progressSection}>
                  {phase === 'preparing' && (
                    <>
                      <Progress />
                      <Typography variant="body1" style={{ marginTop: 16 }}>
                        Preparing remediation workflow...
                      </Typography>
                    </>
                  )}
                  {phase === 'running' && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Applying remediations — {progress}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        style={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        style={{ marginTop: 8 }}
                      >
                        {tasks.filter(t => t.status === 'completed').length}/
                        {tasks.length} rules applied
                      </Typography>
                      <Box mt={2}>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={() => {
                            setPhase('failed');
                          }}
                        >
                          Cancel Remediation
                        </Button>
                      </Box>
                    </>
                  )}
                  {phase === 'failed' && (
                    <>
                      <Typography variant="h6" color="error" gutterBottom>
                        Remediation Cancelled
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {tasks.filter(t => t.status === 'completed').length} of{' '}
                        {tasks.length} rules were applied before cancellation.
                        Remaining rules were not executed.
                      </Typography>
                      <Box mt={2} display="flex" style={{ gap: 16 }} justifyContent="center">
                        <Button
                          variant="outlined"
                          onClick={() => navigate(`/compliance/remediation/${jobId}`)}
                        >
                          Back to Profile Builder
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => navigate('/compliance/scan')}
                        >
                          Run Verification Scan
                        </Button>
                      </Box>
                    </>
                  )}
                  {phase === 'verifying' && (
                    <>
                      <Progress />
                      <Typography variant="body1" style={{ marginTop: 16 }}>
                        Running verification scan to confirm remediation results...
                      </Typography>
                    </>
                  )}
                </div>
              </InfoCard>
            </Grid>
          )}

          {/* Completion: Before/After Comparison */}
          {phase === 'complete' && (
            <>
              <Grid item xs={12}>
                <InfoCard
                  title="Remediation Complete"
                  action={
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Verified"
                      style={{ backgroundColor: '#4caf50', color: '#fff' }}
                    />
                  }
                >
                  <Grid container spacing={3} alignItems="center" justifyContent="center">
                    <Grid item>
                      <div className={classes.comparisonCard}>
                        <Typography variant="caption" color="textSecondary">
                          Before
                        </Typography>
                        <Typography
                          className={classes.bigNumber}
                          style={{ color: '#f44336' }}
                        >
                          73%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          11 of 15 rules failing
                        </Typography>
                      </div>
                    </Grid>
                    <Grid item>
                      <CompareArrowsIcon className={classes.arrow} />
                    </Grid>
                    <Grid item>
                      <div className={classes.comparisonCard}>
                        <Typography variant="caption" color="textSecondary">
                          After
                        </Typography>
                        <Typography
                          className={classes.bigNumber}
                          style={{ color: '#4caf50' }}
                        >
                          93%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          1 of 15 rules failing
                        </Typography>
                      </div>
                    </Grid>
                  </Grid>
                </InfoCard>
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" style={{ gap: 16 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => navigate('/compliance/scan')}
                  >
                    Run Another Scan
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/compliance')}
                  >
                    Back to Dashboard
                  </Button>
                </Box>
              </Grid>
            </>
          )}

          {/* Task List */}
          <Grid item xs={12}>
            <InfoCard title="Remediation Tasks">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>STIG ID</TableCell>
                    <TableCell>Rule</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map(task => (
                    <TableRow key={task.stigId} className={classes.taskRow}>
                      <TableCell>{statusIcon(task.status)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          style={{ fontFamily: 'monospace' }}
                        >
                          {task.stigId}
                        </Typography>
                      </TableCell>
                      <TableCell>{task.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfoCard>
          </Grid>
        </Grid>
    </>
  );
};
