import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  InfoCard,
  Breadcrumbs,
  StatusOK,
  StatusError,
  StatusWarning,
} from '@backstage/core-components';
import {
  Grid,
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
import type { Finding, FindingSeverity, FindingStatus } from '@aap-compliance/common';
import { MOCK_FINDINGS } from './mockFindings';

const useStyles = makeStyles(theme => ({
  severityChip: {
    fontWeight: 600,
    minWidth: 60,
  },
  catI: {
    backgroundColor: theme.palette.error.main,
    color: '#fff',
  },
  catII: {
    backgroundColor: theme.palette.warning.main,
    color: '#fff',
  },
  catIII: {
    backgroundColor: theme.palette.info.main,
    color: '#fff',
  },
  pass: {
    color: theme.palette.success?.main ?? '#4caf50',
  },
  fail: {
    color: theme.palette.error.main,
  },
  findingRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  expandedDetail: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  summaryBar: {
    height: 12,
    borderRadius: 6,
    marginTop: theme.spacing(1),
  },
  filterRow: {
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center',
    flexWrap: 'wrap',
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
  const { jobId } = useParams<{ jobId: string }>();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const findings = MOCK_FINDINGS;
  const passCount = findings.filter(f => f.status === 'pass').length;
  const failCount = findings.filter(f => f.status === 'fail').length;
  const passRate = Math.round((passCount / findings.length) * 100);

  const filtered = findings
    .filter(f => severityFilter === 'all' || f.severity === severityFilter)
    .filter(f => statusFilter === 'all' || f.status === statusFilter)
    .filter(
      f =>
        searchQuery === '' ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.stigId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.ruleId.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const getSeverityClass = (severity: FindingSeverity) => {
    switch (severity) {
      case 'CAT_I': return classes.catI;
      case 'CAT_II': return classes.catII;
      case 'CAT_III': return classes.catIII;
      default: return '';
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
          <Typography>Scan Results</Typography>
        </Breadcrumbs>

        <Box mt={3} />

        <Grid container spacing={3}>
          {/* Summary Stats */}
          <Grid item xs={12} sm={4}>
            <InfoCard>
              <Box textAlign="center" p={2}>
                <Typography
                  variant="h3"
                  className={passRate >= 80 ? classes.pass : classes.fail}
                >
                  {passRate}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Compliance Rate
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={passRate}
                  className={classes.summaryBar}
                  color={passRate >= 80 ? 'primary' : 'secondary'}
                />
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <InfoCard>
              <Box textAlign="center" p={2}>
                <Typography variant="h3" className={classes.pass}>
                  {passCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Rules Passing
                </Typography>
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <InfoCard>
              <Box textAlign="center" p={2}>
                <Typography variant="h3" className={classes.fail}>
                  {failCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Rules Failing
                </Typography>
              </Box>
            </InfoCard>
          </Grid>

          {/* Remediate Button */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<BuildIcon />}
                onClick={() => navigate(`/compliance/remediation/${jobId}`)}
              >
                Build Remediation Profile ({failCount} findings)
              </Button>
            </Box>
          </Grid>

          {/* Filters */}
          <Grid item xs={12}>
            <InfoCard title="Findings">
              <Box mb={2} className={classes.filterRow}>
                <TextField
                  placeholder="Search by title, STIG ID, or rule ID..."
                  variant="outlined"
                  size="small"
                  style={{ minWidth: 300 }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl variant="outlined" size="small" style={{ minWidth: 140 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value as string)}
                    label="Severity"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="CAT_I">CAT I</MenuItem>
                    <MenuItem value="CAT_II">CAT II</MenuItem>
                    <MenuItem value="CAT_III">CAT III</MenuItem>
                  </Select>
                </FormControl>
                <FormControl variant="outlined" size="small" style={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as string)}
                    label="Status"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="pass">Pass</MenuItem>
                    <MenuItem value="fail">Fail</MenuItem>
                  </Select>
                </FormControl>
                <Chip label={`${filtered.length} findings`} variant="outlined" />
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40} />
                      <TableCell>Status</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>STIG ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map(finding => (
                      <React.Fragment key={finding.ruleId}>
                        <TableRow
                          className={classes.findingRow}
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === finding.ruleId ? null : finding.ruleId,
                            )
                          }
                        >
                          <TableCell>
                            <IconButton size="small">
                              {expandedRow === finding.ruleId ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            {finding.status === 'pass' ? (
                              <StatusOK>Pass</StatusOK>
                            ) : (
                              <StatusError>Fail</StatusError>
                            )}
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
                          <TableCell>{finding.title}</TableCell>
                          <TableCell>
                            <Chip label={finding.category} size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} style={{ padding: 0, border: 'none' }}>
                            <Collapse in={expandedRow === finding.ruleId}>
                              <div className={classes.expandedDetail}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12}>
                                    <Typography variant="subtitle2">Description</Typography>
                                    <Typography variant="body2">{finding.description}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="subtitle2">Check</Typography>
                                    <Typography variant="body2">{finding.checkText}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="subtitle2">Fix</Typography>
                                    <Typography variant="body2">{finding.fixText}</Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="textSecondary">
                                      Rule ID: {finding.ruleId}
                                    </Typography>
                                    {finding.disruption === 'high' && (
                                      <Box mt={1}>
                                        <Chip
                                          icon={<StatusWarning />}
                                          label="High disruption — may break existing services"
                                          color="secondary"
                                          size="small"
                                        />
                                      </Box>
                                    )}
                                  </Grid>
                                </Grid>
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
          </Grid>
        </Grid>
    </>
  );
};
