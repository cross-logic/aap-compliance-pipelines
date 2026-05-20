import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { useApi } from '@backstage/core-plugin-api';
import { complianceApiRef } from '../../api';
import type { JobEvent, RemediationSelection } from '@aap-compliance/common';

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
  elapsed: {
    fontFamily: 'monospace',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
}));

type ExecutionPhase = 'launching' | 'preparing' | 'running' | 'verifying' | 'complete' | 'failed';

const PHASES = ['Preparing', 'Remediating', 'Verifying', 'Complete'];

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface RemediationTask {
  name: string;
  stigId: string;
  status: TaskStatus;
  hosts: Array<{ host: string; status: TaskStatus }>;
}

/** Terminal statuses where the workflow will not change further. */
const TERMINAL_STATUSES = ['successful', 'failed', 'error', 'canceled'];

/**
 * Compute overall progress percentage from workflow nodes.
 * Each node contributes equally to the total.
 */
function computeProgress(nodes: Array<{ status: string }>): number {
  if (nodes.length === 0) return 0;
  let pct = 0;
  const step = 100 / nodes.length;
  for (const n of nodes) {
    if (n.status === 'successful') pct += step;
    else if (n.status === 'running' || n.status === 'waiting') pct += step * 0.5;
    else if (n.status === 'failed' || n.status === 'error') pct += step;
  }
  return Math.round(pct);
}

/** Format seconds into human-readable elapsed time. */
function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/**
 * Extract remediation tasks from Controller job events.
 *
 * Maps runner events (runner_on_ok, runner_on_failed, runner_on_start, etc.)
 * into task entries for the progress table.
 */
function extractTasksFromEvents(events: JobEvent[]): RemediationTask[] {
  const taskMap = new Map<string, RemediationTask>();

  for (const event of events) {
    const taskName = (event.event_data?.task as string) || '';
    if (!taskName) continue;
    if (taskName.toLowerCase() === 'gathering facts') continue;
    if (taskName.toLowerCase() === 'gather the package facts') continue;

    const stigMatch = taskName.match(/V-\d+/);
    const stigId = stigMatch ? stigMatch[0] : '';
    const hostName = event.host_name || (event.event_data?.host as string) || '';

    let hostStatus: TaskStatus = 'pending';
    if (event.event === 'runner_on_ok' || event.event === 'runner_on_skipped') {
      hostStatus = 'completed';
    } else if (event.event === 'runner_on_failed' || event.event === 'runner_on_unreachable') {
      hostStatus = 'failed';
    } else if (event.event === 'runner_on_start') {
      hostStatus = 'running';
    }

    const existing = taskMap.get(taskName);
    if (!existing) {
      taskMap.set(taskName, {
        name: taskName,
        stigId,
        status: hostStatus,
        hosts: hostName ? [{ host: hostName, status: hostStatus }] : [],
      });
    } else {
      if (hostName) {
        const existingHost = existing.hosts.find(h => h.host === hostName);
        if (existingHost) {
          if (existingHost.status !== 'completed' && existingHost.status !== 'failed') {
            existingHost.status = hostStatus;
          }
        } else {
          existing.hosts.push({ host: hostName, status: hostStatus });
        }
      }
      const hasFailure = existing.hosts.some(h => h.status === 'failed');
      const allDone = existing.hosts.every(h => h.status === 'completed' || h.status === 'failed');
      if (hasFailure) existing.status = 'failed';
      else if (allDone && existing.hosts.length > 0) existing.status = 'completed';
      else if (existing.hosts.some(h => h.status === 'running')) existing.status = 'running';
    }
  }

  return Array.from(taskMap.values());
}

export const RemediationExecution = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<ExecutionPhase>('launching');
  const [progress, setProgress] = useState(0);
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [workflowJobId, setWorkflowJobId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState('pending');
  const completeFired = useRef(false);

  // Extract the remediation profile ID and scan ID from query params
  // (set by the RemediationProfileBuilder when "Apply Remediation" is clicked)
  const remediationProfileId = searchParams.get('profileId');
  const scanId = searchParams.get('scanId') ?? jobId;

  // Launch the remediation via the backend
  const launchRemediation = useCallback(async () => {
    try {
      // Load selections from the saved remediation profile
      let selections: RemediationSelection[] = [];

      if (remediationProfileId) {
        const profile = await api.getRemediationProfile(remediationProfileId);
        if (profile && profile.selections.length > 0) {
          selections = profile.selections;
        }
      }

      if (selections.length === 0) {
        setPhase('failed');
        setErrorMessage(
          'No rule selections found. Go back to the Remediation Profile Builder and select rules before applying.',
        );
        return;
      }

      const result = await api.launchRemediation({
        profileId: 'rhel9-stig',
        inventoryId: 1,
        selections,
        scanId,
      });
      setWorkflowJobId(result.workflowJobId);
      setPhase('preparing');
    } catch (err) {
      setPhase('failed');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to launch remediation workflow',
      );
    }
  }, [api, remediationProfileId, scanId]);

  useEffect(() => {
    launchRemediation();
  }, [launchRemediation]);

  // Poll the workflow status and find the remediate node's job events
  useEffect(() => {
    if (!workflowJobId) return undefined;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        // Poll workflow status (remediation now launches via workflow)
        const workflowStatus = await api.getWorkflowStatus(workflowJobId).catch(() => null);
        if (cancelled || !workflowStatus) return;

        setOverallStatus(workflowStatus.status);
        setElapsed(workflowStatus.elapsed ?? 0);

        // Get workflow nodes to determine the phase and find the remediate job
        let remediateJobId: number | undefined;
        try {
          const wfNodes = await api.getWorkflowNodes(workflowJobId);

          // Derive phase from workflow nodes
          const remediateNode = wfNodes.find(
            n => n.identifier === 'remediate' ||
              n.summary_fields?.unified_job_template?.name?.toLowerCase().includes('remediat'),
          );
          const evaluateNode = wfNodes.find(
            n => n.identifier === 'evaluate' ||
              n.summary_fields?.unified_job_template?.name?.toLowerCase().includes('evaluat'),
          );

          remediateJobId = remediateNode?.summary_fields?.job?.id;

          if (workflowStatus.status === 'successful') {
            setPhase('complete');
            setProgress(100);
          } else if (TERMINAL_STATUSES.includes(workflowStatus.status)) {
            setPhase('failed');
            setErrorMessage(
              workflowStatus.failed
                ? `Remediation failed after ${formatElapsed(workflowStatus.elapsed ?? 0)}`
                : `Remediation ${workflowStatus.status}`,
            );
            setProgress(100);
          } else if (remediateNode?.summary_fields?.job?.status === 'running' ||
                     remediateNode?.summary_fields?.job?.status === 'successful') {
            setPhase('running');
          } else if (evaluateNode?.summary_fields?.job?.status === 'running' ||
                     evaluateNode?.summary_fields?.job?.status === 'successful') {
            setPhase('verifying');
          } else if (workflowStatus.status === 'running') {
            setPhase('preparing');
          }

          // Update progress from node statuses
          const nodeStatuses = wfNodes
            .filter(n => n.summary_fields?.job)
            .map(n => ({ status: n.summary_fields?.job?.status ?? 'pending' }));
          if (nodeStatuses.length > 0 && !TERMINAL_STATUSES.includes(workflowStatus.status)) {
            setProgress(computeProgress(nodeStatuses));
          }
        } catch {
          // Workflow nodes may not be available yet
          if (workflowStatus.status === 'running') {
            setPhase('preparing');
            setProgress(10);
          }
        }

        // Fetch task-level events from the remediate job within the workflow
        if (remediateJobId) {
          try {
            const events = await api.getJobEvents(remediateJobId);
            if (!cancelled) {
              const extracted = extractTasksFromEvents(events);
              if (extracted.length > 0) {
                setTasks(extracted);
                const done = extracted.filter(t => t.status === 'completed' || t.status === 'failed').length;
                if (extracted.length > 0 && !TERMINAL_STATUSES.includes(workflowStatus.status)) {
                  setProgress(Math.round((done / extracted.length) * 100));
                }
              }
            }
          } catch {
            // Job events may not be available yet
          }
        }

        if (TERMINAL_STATUSES.includes(workflowStatus.status) && !completeFired.current) {
          completeFired.current = true;
        }
      } catch {
        // API not available yet
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [api, workflowJobId]);

  const activeStep =
    phase === 'launching' || phase === 'preparing'
      ? 0
      : phase === 'running'
        ? 1
        : phase === 'verifying'
          ? 2
          : phase === 'complete'
            ? 3
            : // failed -- stay at whichever step was active
              progress < 33 ? 0 : progress < 66 ? 1 : 2;

  const statusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <StatusOK />;
      case 'failed':
        return <StatusError />;
      case 'running':
        return <StatusRunning />;
      case 'pending':
        return <StatusPending />;
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

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
              {PHASES.map((label, i) => (
                <Step key={label} completed={activeStep > i}>
                  <StepLabel
                    error={phase === 'failed' && activeStep === i}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Grid>

          {/* Progress Bar */}
          {phase !== 'complete' && (
            <Grid item xs={12}>
              <InfoCard>
                <div className={classes.progressSection}>
                  {phase === 'launching' && (
                    <>
                      <Progress />
                      <Typography variant="body1" style={{ marginTop: 16 }}>
                        Launching remediation workflow...
                      </Typography>
                    </>
                  )}
                  {phase === 'preparing' && (
                    <>
                      <Progress />
                      <Typography variant="body1" style={{ marginTop: 16 }}>
                        Preparing remediation workflow...
                      </Typography>
                      {elapsed > 0 && (
                        <Typography variant="body2" className={classes.elapsed}>
                          Elapsed: {formatElapsed(elapsed)}
                        </Typography>
                      )}
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
                        {tasks.length > 0
                          ? `${completedCount}/${tasks.length} tasks complete${failedCount > 0 ? ` (${failedCount} failed)` : ''}`
                          : `${progress}% complete`}
                      </Typography>
                      <Typography variant="body2" className={classes.elapsed}>
                        Elapsed: {formatElapsed(elapsed)}
                      </Typography>
                    </>
                  )}
                  {phase === 'failed' && (
                    <>
                      <Typography variant="h6" color="error" gutterBottom>
                        Remediation {overallStatus === 'canceled' ? 'Cancelled' : 'Failed'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {errorMessage ||
                          (overallStatus === 'canceled'
                            ? `${completedCount} of ${tasks.length || '?'} tasks were applied before cancellation.`
                            : 'The remediation workflow encountered an error.')}
                      </Typography>
                      {elapsed > 0 && (
                        <Typography variant="body2" className={classes.elapsed}>
                          Elapsed: {formatElapsed(elapsed)}
                        </Typography>
                      )}
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
                          onClick={() => navigate('/compliance/scan?scanType=verification')}
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

          {/* Completion Summary */}
          {phase === 'complete' && (
            <>
              <Grid item xs={12}>
                <InfoCard
                  title="Remediation Complete"
                  action={
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={failedCount > 0 ? 'Completed with errors' : 'Successful'}
                      style={{
                        backgroundColor: failedCount > 0 ? '#ff9800' : '#4caf50',
                        color: '#fff',
                      }}
                    />
                  }
                >
                  <Box textAlign="center" py={2}>
                    <Typography variant="h6" gutterBottom>
                      {completedCount} of {tasks.length || '?'} tasks completed successfully
                      {failedCount > 0 && ` (${failedCount} failed)`}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total elapsed time: {formatElapsed(elapsed)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                      Run a verification scan to confirm the remediation results and
                      see updated compliance scores.
                    </Typography>
                  </Box>
                </InfoCard>
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" style={{ gap: 16 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => navigate('/compliance/scan?scanType=verification')}
                  >
                    Run Verification Scan
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
          {tasks.length > 0 && (
            <Grid item xs={12}>
              <InfoCard title="Remediation Tasks">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40}>Status</TableCell>
                      <TableCell>Rule</TableCell>
                      <TableCell>Hosts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task, idx) => (
                      <TableRow key={`${task.name}-${idx}`} className={classes.taskRow}>
                        <TableCell>{statusIcon(task.status)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" style={{ fontWeight: 500 }}>
                            {task.name}
                          </Typography>
                          {task.stigId && (
                            <Typography variant="caption" color="textSecondary" style={{ fontFamily: 'monospace' }}>
                              {task.stigId}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.hosts.length > 0 ? (
                            <Box display="flex" flexWrap="wrap" style={{ gap: 4 }}>
                              {task.hosts.map(h => (
                                <Chip
                                  key={h.host}
                                  size="small"
                                  label={h.host}
                                  variant="outlined"
                                  style={{
                                    borderColor: h.status === 'failed' ? '#C9190B'
                                      : h.status === 'completed' ? '#3E8635'
                                      : undefined,
                                    color: h.status === 'failed' ? '#C9190B'
                                      : h.status === 'completed' ? '#3E8635'
                                      : undefined,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfoCard>
            </Grid>
          )}

          {/* Empty task list placeholder while waiting for events */}
          {tasks.length === 0 && (phase === 'preparing' || phase === 'launching') && (
            <Grid item xs={12}>
              <InfoCard title="Remediation Tasks">
                <Box p={3} textAlign="center">
                  <Typography variant="body2" color="textSecondary">
                    Waiting for workflow to start...
                  </Typography>
                </Box>
              </InfoCard>
            </Grid>
          )}

          {tasks.length === 0 && phase === 'running' && (
            <Grid item xs={12}>
              <InfoCard title="Remediation Tasks">
                <Box p={3} textAlign="center">
                  <Typography variant="body2" color="textSecondary">
                    Collecting task events from the automation controller...
                  </Typography>
                </Box>
              </InfoCard>
            </Grid>
          )}
        </Grid>
    </>
  );
};
