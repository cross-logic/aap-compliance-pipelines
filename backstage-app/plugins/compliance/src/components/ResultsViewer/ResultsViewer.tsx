import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  InfoCard,
  Breadcrumbs,
  Progress,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Typography,
  Button,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  LinearProgress,
  IconButton,
  Collapse,
  makeStyles,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import BuildIcon from '@material-ui/icons/Build';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import AssessmentIcon from '@material-ui/icons/Assessment';
import type { FindingSeverity, MultiHostFinding } from '@aap-compliance/common';
import { complianceApiRef } from '../../api';
import { ExportButton } from './ExportButton';

const useStyles = makeStyles(theme => ({
  severityChip: {
    fontWeight: 600,
    minWidth: 60,
  },
  catI: { backgroundColor: '#C9190B', color: '#fff' },
  catII: { backgroundColor: '#F0AB00', color: '#fff' },
  catIII: { backgroundColor: '#0066CC', color: '#fff' },
  passBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  findingRow: {
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.palette.action.hover },
  },
  hostDetailRow: {
    backgroundColor: theme.palette.background.default,
  },
  hostStatusPass: {
    color: '#3E8635',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  hostStatusFail: {
    color: '#C9190B',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  hostCountChip: {
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  filterRow: {
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: theme.spacing(2),
  },
  summarySection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  summaryCard: {
    flex: '1 1 200px',
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 700,
  },
  summaryLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
  },
  hostDetail: {
    padding: theme.spacing(1, 2, 1, 6),
  },
  expandedSection: {
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  ruleDescription: {
    padding: theme.spacing(1.5, 2),
    backgroundColor: theme.palette.background.default,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(8, 4),
  },
}));

const severityLabel: Record<FindingSeverity, string> = {
  CAT_I: 'CAT I',
  CAT_II: 'CAT II',
  CAT_III: 'CAT III',
};

const severityOrder: Record<FindingSeverity, number> = {
  CAT_I: 0,
  CAT_II: 1,
  CAT_III: 2,
};

export const ResultsViewer = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const severityFilter = searchParams.get('severity') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const searchQuery = searchParams.get('q') || '';

  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Fetch findings from the backend -- no frontend mock fallback (S2)
  const [findings, setFindings] = useState<MultiHostFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.getFindings(jobId)
      .then(data => {
        if (!cancelled) {
          setFindings(data);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, jobId]);

  const totalHosts = findings[0]?.totalCount || 0;
  const rulesWithFailures = findings.filter(f => f.failCount > 0).length;
  const totalRules = findings.length;
  const totalChecks = findings.reduce((sum, f) => sum + f.totalCount, 0);
  const overallPassRate = totalChecks > 0
    ? Math.round(
        (findings.reduce((sum, f) => sum + f.passCount, 0) / totalChecks) * 100,
      )
    : 0;

  const filtered = useMemo(() =>
    findings
      .filter(f => severityFilter === 'all' || f.severity === severityFilter)
      .filter(f => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'fail') return f.failCount > 0;
        if (statusFilter === 'pass') return f.failCount === 0;
        return true;
      })
      .filter(f =>
        searchQuery === '' ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.stigId.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [findings, severityFilter, statusFilter, searchQuery],
  );

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params, { replace: true });
  };

  const getSeverityClass = (severity: FindingSeverity) => {
    switch (severity) {
      case 'CAT_I': return classes.catI;
      case 'CAT_II': return classes.catII;
      case 'CAT_III': return classes.catIII;
      default: return '';
    }
  };

  if (loading) {
    return (
      <Box p={4}>
        <Progress />
        <Typography variant="body2" align="center" style={{ marginTop: 16 }}>
          Loading scan results...
        </Typography>
      </Box>
    );
  }

  // P3-3: Empty state when no findings are available
  if (findings.length === 0 && !error) {
    return (
      <>
        <Breadcrumbs>
          <Typography color="primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/compliance')}>
            Compliance
          </Typography>
          <Typography>Scan Results</Typography>
        </Breadcrumbs>

        <Box mt={2} />

        <InfoCard title="Scan Results">
          <div className={classes.emptyState}>
            <AssessmentIcon style={{ fontSize: 64, color: '#6A6E73', marginBottom: 16 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No scan results yet
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Launch a compliance scan to see findings and per-host results here.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/compliance/scan')}
            >
              Launch a Scan
            </Button>
          </div>
        </InfoCard>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Breadcrumbs>
          <Typography color="primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/compliance')}>
            Compliance
          </Typography>
          <Typography>Scan Results</Typography>
        </Breadcrumbs>

        <Box mt={2} />

        <InfoCard title="Error Loading Results">
          <Box p={3} textAlign="center">
            <Typography variant="body1" color="error" gutterBottom>
              Failed to load scan results: {error}
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/compliance')}>
              Back to Dashboard
            </Button>
          </Box>
        </InfoCard>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs>
        <Typography color="primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/compliance')}>
          Compliance
        </Typography>
        <Typography>Scan Results</Typography>
      </Breadcrumbs>

      <Box mt={2} />

      {/* Summary Cards */}
      <div className={classes.summarySection}>
        <InfoCard>
          <div className={classes.summaryCard}>
            <Typography className={classes.summaryValue} style={{ color: overallPassRate >= 80 ? '#3E8635' : '#C9190B' }}>
              {overallPassRate}%
            </Typography>
            <Typography className={classes.summaryLabel}>Overall Compliance</Typography>
          </div>
        </InfoCard>
        <InfoCard>
          <div className={classes.summaryCard}>
            <Typography className={classes.summaryValue}>{totalHosts}</Typography>
            <Typography className={classes.summaryLabel}>Hosts Scanned</Typography>
          </div>
        </InfoCard>
        <InfoCard>
          <div className={classes.summaryCard}>
            <Typography className={classes.summaryValue}>{totalRules}</Typography>
            <Typography className={classes.summaryLabel}>Rules Evaluated</Typography>
          </div>
        </InfoCard>
        <InfoCard>
          <div className={classes.summaryCard}>
            <Typography className={classes.summaryValue} style={{ color: '#C9190B' }}>
              {rulesWithFailures}
            </Typography>
            <Typography className={classes.summaryLabel}>Rules with Failures</Typography>
          </div>
        </InfoCard>
      </div>

      {/* Action Buttons: Remediate + Export (P3-2) */}
      <Box display="flex" justifyContent="flex-end" mb={2} style={{ gap: 8 }}>
        <ExportButton findings={filtered} profileName={jobId} />
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<BuildIcon />}
          onClick={() => navigate(`/compliance/remediation/${jobId}`)}
        >
          Build Remediation Profile ({rulesWithFailures} rules with failures)
        </Button>
      </Box>

      {/* Findings Table */}
      <InfoCard title="Findings by Rule">
        {/* Filters */}
        <div className={classes.filterRow}>
          <TextField
            placeholder="Search by title or STIG ID..."
            variant="outlined"
            size="small"
            style={{ minWidth: 280 }}
            value={searchQuery}
            onChange={e => updateFilter('q', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            }}
          />
          <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
            <InputLabel>Severity</InputLabel>
            <Select value={severityFilter} onChange={e => updateFilter('severity', e.target.value as string)} label="Severity">
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="CAT_I">CAT I</MenuItem>
              <MenuItem value="CAT_II">CAT II</MenuItem>
              <MenuItem value="CAT_III">CAT III</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={e => updateFilter('status', e.target.value as string)} label="Status">
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pass">All Pass</MenuItem>
              <MenuItem value="fail">Has Failures</MenuItem>
            </Select>
          </FormControl>
          <Chip label={`${filtered.length} rules`} variant="outlined" />
        </div>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <TableCell>Severity</TableCell>
                <TableCell>STIG ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell align="center">Hosts</TableCell>
                <TableCell width={200}>Pass Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(finding => (
                <React.Fragment key={finding.ruleId}>
                  {/* Rule row */}
                  <TableRow
                    className={classes.findingRow}
                    onClick={() => setExpandedRule(expandedRule === finding.ruleId ? null : finding.ruleId)}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {expandedRule === finding.ruleId ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={severityLabel[finding.severity]}
                        size="small"
                        className={`${classes.severityChip} ${getSeverityClass(finding.severity)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                        {finding.stigId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{finding.title}</Typography>
                      {finding.disruption === 'high' && (
                        <Chip label="High disruption" size="small" color="secondary" style={{ marginTop: 4 }} />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {finding.failCount === 0 ? (
                        <Chip
                          label={`${finding.passCount}/${finding.totalCount}`}
                          size="small"
                          style={{ backgroundColor: '#3E8635', color: '#fff' }}
                          className={classes.hostCountChip}
                        />
                      ) : (
                        <Box display="flex" justifyContent="center" style={{ gap: 4 }}>
                          <Chip
                            label={`${finding.passCount} pass`}
                            size="small"
                            style={{ backgroundColor: '#3E8635', color: '#fff', fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={`${finding.failCount} fail`}
                            size="small"
                            style={{ backgroundColor: '#C9190B', color: '#fff', fontSize: '0.7rem' }}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(finding.passCount / finding.totalCount) * 100}
                          className={classes.passBar}
                          style={{ flex: 1 }}
                          color={finding.passCount === finding.totalCount ? 'primary' : 'secondary'}
                        />
                        <Typography variant="caption" style={{ minWidth: 36 }}>
                          {Math.round((finding.passCount / finding.totalCount) * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail: description + host-level breakdown */}
                  <TableRow>
                    <TableCell colSpan={6} style={{ padding: 0, border: 'none' }}>
                      <Collapse in={expandedRule === finding.ruleId}>
                        {/* Rule description */}
                        <div className={classes.ruleDescription}>
                          <Typography variant="body2" gutterBottom>{finding.description}</Typography>
                          <Box display="flex" style={{ gap: 24 }}>
                            <div>
                              <Typography variant="caption" color="textSecondary">Check</Typography>
                              <Typography variant="body2">{finding.checkText}</Typography>
                            </div>
                            <div>
                              <Typography variant="caption" color="textSecondary">Fix</Typography>
                              <Typography variant="body2">{finding.fixText}</Typography>
                            </div>
                          </Box>
                        </div>

                        {/* Host-level breakdown */}
                        <div className={classes.expandedSection}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Host</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actual Value</TableCell>
                                <TableCell>Expected Value</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {finding.hosts
                                .sort((a, b) => (a.status === 'fail' ? -1 : 1) - (b.status === 'fail' ? -1 : 1))
                                .map(hostFinding => (
                                  <TableRow key={hostFinding.host} className={classes.hostDetailRow}>
                                    <TableCell>
                                      <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                                        {hostFinding.host}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <div className={hostFinding.status === 'pass' ? classes.hostStatusPass : classes.hostStatusFail}>
                                        {hostFinding.status === 'pass'
                                          ? <><CheckCircleIcon fontSize="small" /> Pass</>
                                          : <><ErrorIcon fontSize="small" /> Fail</>
                                        }
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        variant="body2"
                                        style={{
                                          fontFamily: 'monospace',
                                          color: hostFinding.status === 'fail' ? '#C9190B' : 'inherit',
                                          fontWeight: hostFinding.status === 'fail' ? 600 : 400,
                                        }}
                                      >
                                        {hostFinding.actualValue}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                                        {hostFinding.expectedValue}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </InfoCard>
    </>
  );
};
