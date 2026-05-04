import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  InfoCard,
  Breadcrumbs,
  Progress,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { catalogEntityCreatePermission } from '@backstage/plugin-catalog-common/alpha';
import {
  Typography,
  Button,
  Chip,
  Box,
  Switch,
  Collapse,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  makeStyles,
} from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import SaveIcon from '@material-ui/icons/Save';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import WarningIcon from '@material-ui/icons/Warning';
import InfoIcon from '@material-ui/icons/Info';
import type { FindingSeverity, MultiHostFinding } from '@aap-compliance/common';
import { complianceApiRef } from '../../api';

const useStyles = makeStyles(theme => ({
  findingCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    overflow: 'hidden',
  },
  findingHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    gap: theme.spacing(1.5),
  },
  findingDisabled: {
    opacity: 0.5,
    backgroundColor: theme.palette.action.disabledBackground,
  },
  findingEnabled: {
    backgroundColor: theme.palette.background.paper,
  },
  severityChip: { fontWeight: 600, minWidth: 60 },
  catI: { backgroundColor: '#C9190B', color: '#fff' },
  catII: { backgroundColor: '#F0AB00', color: '#fff' },
  catIII: { backgroundColor: '#0066CC', color: '#fff' },
  detailPanel: {
    padding: theme.spacing(2, 3),
    backgroundColor: theme.palette.background.default,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },
  summaryCount: { display: 'flex', gap: theme.spacing(3) },
  bulkActions: { display: 'flex', gap: theme.spacing(1), flexWrap: 'wrap' as const },
  disruptionWarning: {
    display: 'flex', alignItems: 'center', gap: theme.spacing(0.5),
    color: theme.palette.warning.main, fontSize: '0.75rem',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: theme.spacing(1.5, 2), backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius, marginBottom: theme.spacing(1), marginTop: theme.spacing(2),
  },
  titleGroup: { display: 'flex', flexDirection: 'column' as const, flex: 1, minWidth: 0 },
  impactText: { color: theme.palette.text.secondary, fontSize: '0.8rem', marginTop: 2 },
  hostBreakdown: {
    display: 'flex', alignItems: 'center', gap: theme.spacing(1),
    fontSize: '0.8rem', color: theme.palette.text.secondary,
  },
  adviceBanner: {
    display: 'flex', alignItems: 'flex-start', gap: theme.spacing(1),
    padding: theme.spacing(1.5, 2), backgroundColor: '#FFF3CD',
    borderRadius: theme.shape.borderRadius, marginBottom: theme.spacing(1.5),
    border: '1px solid #FFECB5',
  },
  adviceIcon: { color: '#856404', marginTop: 2 },
  remediationStrategy: {
    padding: theme.spacing(1.5, 0),
  },
}));

type RemediationScope = 'failed_only' | 'standardize_all';

interface RuleSelection {
  enabled: boolean;
  expanded: boolean;
  scope: RemediationScope;
  parameters: Record<string, string | number | boolean>;
}

const severityLabel: Record<FindingSeverity, string> = {
  CAT_I: 'CAT I — Critical',
  CAT_II: 'CAT II — Medium',
  CAT_III: 'CAT III — Low',
};

export const RemediationProfileBuilder = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const { jobId } = useParams<{ jobId: string }>();

  // Permission check: reuse catalogEntityCreatePermission following
  // the upstream Ansible Portal pattern. Controls the Apply Remediation
  // button — reading/viewing findings is always allowed.
  const { allowed: canRemediate } = usePermission({
    permission: catalogEntityCreatePermission,
  });

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch findings from the backend (S2: no frontend mock data)
  const [allFindings, setAllFindings] = useState<MultiHostFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getFindings(jobId)
      .then(data => {
        if (!cancelled) setAllFindings(data);
      })
      .catch(() => {
        // Keep empty on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, jobId]);

  const failedFindings = useMemo(
    () => allFindings.filter(f => f.failCount > 0),
    [allFindings],
  );

  const [selections, setSelections] = useState<Record<string, RuleSelection>>({});

  // Initialize selections when findings load
  useEffect(() => {
    if (failedFindings.length === 0) return;
    setSelections(prev => {
      // Only initialize if empty (avoid resetting user changes)
      if (Object.keys(prev).length > 0) return prev;
      const initial: Record<string, RuleSelection> = {};
      failedFindings.forEach(f => {
        initial[f.ruleId] = {
          enabled: f.disruption !== 'high',
          expanded: false,
          scope: 'failed_only',
          parameters: Object.fromEntries(
            f.parameters.map(p => [p.name, p.default]),
          ),
        };
      });
      return initial;
    });
  }, [failedFindings]);

  const toggleFinding = (ruleId: string) => {
    setSelections(prev => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], enabled: !prev[ruleId].enabled },
    }));
  };

  const toggleExpanded = (ruleId: string) => {
    setSelections(prev => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], expanded: !prev[ruleId].expanded },
    }));
  };

  const setScope = (ruleId: string, scope: RemediationScope) => {
    setSelections(prev => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], scope },
    }));
  };

  const updateParameter = (ruleId: string, paramName: string, value: string | number | boolean) => {
    setSelections(prev => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], parameters: { ...prev[ruleId].parameters, [paramName]: value } },
    }));
  };

  const selectAll = () => {
    setSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], enabled: true }; });
      return updated;
    });
  };

  const clearAll = () => {
    setSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], enabled: false }; });
      return updated;
    });
  };

  const selectBySeverity = (...severities: FindingSeverity[]) => {
    setSelections(prev => {
      const updated = { ...prev };
      failedFindings.forEach(f => {
        updated[f.ruleId] = { ...updated[f.ruleId], enabled: severities.includes(f.severity) };
      });
      return updated;
    });
  };

  const enabledCount = Object.values(selections).filter(s => s.enabled).length;
  const disabledCount = Object.values(selections).filter(s => !s.enabled).length;

  const totalAffectedHosts = useMemo(() => {
    const hostSet = new Set<string>();
    failedFindings.forEach(f => {
      const sel = selections[f.ruleId];
      if (sel?.enabled) {
        if (sel.scope === 'standardize_all') {
          f.hosts.forEach(h => hostSet.add(h.host));
        } else {
          f.hosts.filter(h => h.status === 'fail').forEach(h => hostSet.add(h.host));
        }
      }
    });
    return hostSet.size;
  }, [failedFindings, selections]);

  const groupedBySeverity = useMemo(() => {
    const groups: Record<FindingSeverity, MultiHostFinding[]> = { CAT_I: [], CAT_II: [], CAT_III: [] };
    failedFindings.forEach(f => groups[f.severity].push(f));
    return groups;
  }, [failedFindings]);

  const getSeverityClass = (severity: FindingSeverity) => {
    switch (severity) {
      case 'CAT_I': return classes.catI;
      case 'CAT_II': return classes.catII;
      case 'CAT_III': return classes.catIII;
      default: return '';
    }
  };

  const renderFinding = (finding: MultiHostFinding) => {
    const sel = selections[finding.ruleId];
    if (!sel) return null;

    const failRatio = finding.failCount / finding.totalCount;
    const showHomogeneityAdvice = finding.failCount > 0 && finding.failCount <= 3 && finding.totalCount >= 10;

    return (
      <div
        key={finding.ruleId}
        className={`${classes.findingCard} ${sel.enabled ? classes.findingEnabled : classes.findingDisabled}`}
      >
        {/* Rule header */}
        <div className={classes.findingHeader}>
          <Switch checked={sel.enabled} onChange={() => toggleFinding(finding.ruleId)} color="primary" size="small" inputProps={{ 'aria-label': `Toggle rule ${finding.stigId} for remediation` }} />
          <Chip
            label={finding.stigId}
            size="small"
            variant="outlined"
            style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
          <div className={classes.titleGroup}>
            <Typography variant="subtitle2">{finding.title}</Typography>
            <div className={classes.hostBreakdown}>
              <span style={{ color: '#C9190B', fontWeight: 600 }}>{finding.failCount} failed</span>
              <span>/</span>
              <span>{finding.totalCount} hosts</span>
              {finding.hosts.filter(h => h.status === 'fail').length > 0 && (
                <span style={{ color: '#666' }}>
                  ({finding.hosts.filter(h => h.status === 'fail').map(h => h.host).join(', ')})
                </span>
              )}
            </div>
          </div>

          {finding.disruption === 'high' && (
            <div className={classes.disruptionWarning}>
              <WarningIcon fontSize="small" />
              <span>High disruption</span>
            </div>
          )}

          <IconButton
            size="small"
            onClick={e => { e.stopPropagation(); toggleExpanded(finding.ruleId); }}
            aria-label={sel.expanded ? `Collapse rule details for ${finding.stigId}` : `Expand rule details for ${finding.stigId}`}
          >
            {sel.expanded ? <ExpandLessIcon /> : <SettingsIcon fontSize="small" />}
          </IconButton>
        </div>

        {/* Expanded: scope selection, parameters, host detail */}
        <Collapse in={sel.expanded}>
          <div className={classes.detailPanel}>
            {/* Homogeneity advice */}
            {showHomogeneityAdvice && (
              <div className={classes.adviceBanner}>
                <InfoIcon className={classes.adviceIcon} fontSize="small" />
                <div>
                  <Typography variant="body2" style={{ color: '#856404', fontWeight: 600 }}>
                    Only {finding.failCount} of {finding.totalCount} hosts failed this rule.
                  </Typography>
                  <Typography variant="caption" style={{ color: '#856404' }}>
                    Consider whether{' '}
                    {finding.hosts.filter(h => h.status === 'fail').map(h => h.host).join(', ')}{' '}
                    should belong to a different inventory with different compliance requirements.
                  </Typography>
                </div>
              </div>
            )}

            {/* Remediation scope */}
            <div className={classes.remediationStrategy}>
              <Typography variant="caption" color="textSecondary" gutterBottom>
                Remediation Scope
              </Typography>
              <RadioGroup
                value={sel.scope}
                onChange={e => setScope(finding.ruleId, e.target.value as RemediationScope)}
              >
                <FormControlLabel
                  value="failed_only"
                  control={<Radio size="small" color="primary" />}
                  label={
                    <Typography variant="body2">
                      Remediate failed hosts only ({finding.failCount} hosts)
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="standardize_all"
                  control={<Radio size="small" color="primary" />}
                  label={
                    <Typography variant="body2">
                      Apply to all hosts — standardize to same setting ({finding.totalCount} hosts)
                    </Typography>
                  }
                />
              </RadioGroup>
            </div>

            {/* Parameters */}
            {finding.parameters.length > 0 && (
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary" gutterBottom>
                  Parameters
                  {sel.scope === 'standardize_all' && (
                    <span style={{ fontStyle: 'italic' }}> — applied to all {finding.totalCount} hosts</span>
                  )}
                </Typography>
                <Box display="flex" flexWrap="wrap" style={{ gap: 16, marginTop: 8 }}>
                  {finding.parameters.map(param => (
                    <div key={param.name} style={{ flex: '1 1 200px', maxWidth: 300 }}>
                      {param.type === 'select' ? (
                        <FormControl variant="outlined" size="small" fullWidth>
                          <InputLabel>{param.label}</InputLabel>
                          <Select
                            value={sel.parameters[param.name] ?? param.default}
                            onChange={e => updateParameter(finding.ruleId, param.name, e.target.value as string)}
                            label={param.label}
                          >
                            {param.options?.map(opt => (
                              <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          label={param.label}
                          variant="outlined"
                          size="small"
                          fullWidth
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={sel.parameters[param.name] ?? param.default}
                          onChange={e => updateParameter(
                            finding.ruleId, param.name,
                            param.type === 'number' ? Number(e.target.value) : e.target.value,
                          )}
                          helperText={param.description}
                        />
                      )}
                    </div>
                  ))}
                </Box>
              </Box>
            )}

            {/* Failed host detail */}
            <Box mt={2}>
              <Typography variant="caption" color="textSecondary">
                Failed Hosts — Actual Values
              </Typography>
              <Box mt={1}>
                {finding.hosts.filter(h => h.status === 'fail').map(h => (
                  <Box key={h.host} display="flex" style={{ gap: 16 }} py={0.5}>
                    <Typography variant="body2" style={{ fontFamily: 'monospace', minWidth: 120 }}>
                      {h.host}
                    </Typography>
                    <Typography variant="body2" style={{ fontFamily: 'monospace', color: '#C9190B' }}>
                      {h.actualValue}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      (expected: {h.expectedValue})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </div>
        </Collapse>
      </div>
    );
  };

  if (loading) {
    return (
      <Box p={4}>
        <Progress />
        <Typography variant="body2" align="center" style={{ marginTop: 16 }}>
          Loading findings for remediation...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Breadcrumbs>
        <Typography color="primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/compliance')}>
          Compliance
        </Typography>
        <Typography color="primary" style={{ cursor: 'pointer' }} onClick={() => navigate(`/compliance/results/${jobId}`)}>
          Scan Results
        </Typography>
        <Typography>Remediation</Typography>
      </Breadcrumbs>

      <Box mt={2} />

      {/* Summary Bar */}
      <div className={classes.summaryBar}>
        <div className={classes.summaryCount}>
          <Typography variant="body1"><strong>{failedFindings.length}</strong> rules with failures</Typography>
          <Typography variant="body1" style={{ color: '#3E8635' }}><strong>{enabledCount}</strong> selected</Typography>
          <Typography variant="body1" color="textSecondary"><strong>{disabledCount}</strong> skipped</Typography>
          <Typography variant="body1" color="textSecondary"><strong>{totalAffectedHosts}</strong> hosts affected</Typography>
        </div>
        <div className={classes.bulkActions}>
          <Button size="small" variant="outlined" onClick={selectAll}>Select All</Button>
          <Button size="small" variant="outlined" onClick={() => selectBySeverity('CAT_I')}>CAT I Only</Button>
          <Button size="small" variant="outlined" onClick={() => selectBySeverity('CAT_I', 'CAT_II')}>CAT I + II</Button>
          <Button size="small" variant="outlined" onClick={clearAll}>Clear All</Button>
        </div>
      </div>

      {/* Findings by Severity */}
      {(['CAT_I', 'CAT_II', 'CAT_III'] as FindingSeverity[]).map(severity => {
        const group = groupedBySeverity[severity];
        if (group.length === 0) return null;
        const groupEnabled = group.filter(f => selections[f.ruleId]?.enabled).length;

        return (
          <React.Fragment key={severity}>
            <div className={classes.sectionHeader}>
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                <Chip
                  label={severityLabel[severity]}
                  size="small"
                  className={`${classes.severityChip} ${getSeverityClass(severity)}`}
                />
                <Typography variant="body2" color="textSecondary">
                  {groupEnabled}/{group.length} selected
                </Typography>
              </Box>
            </div>
            {group.map(finding => renderFinding(finding))}
          </React.Fragment>
        );
      })}

      <Divider style={{ margin: '24px 0' }} />

      {/* Action Buttons */}
      <Box display="flex" justifyContent="flex-end" style={{ gap: 16 }}>
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => { setSaveError(null); setSaveDialogOpen(true); }}>
          Save Remediation
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={() => navigate(`/compliance/execute/${jobId}`)}
          disabled={enabledCount === 0 || !canRemediate}
          title={!canRemediate ? 'You do not have permission to apply remediations' : undefined}
        >
          Apply Remediation ({enabledCount} rules, {totalAffectedHosts} hosts)
        </Button>
      </Box>

      {/* Save Remediation Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Remediation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Save your rule selections, scope choices, and parameter overrides as a
            reusable remediation. You can find and re-apply saved remediations from the
            Remediations tab.
          </Typography>
          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder="e.g., production-web-servers-stig-v2r8"
            helperText="A descriptive name to identify this remediation later"
            style={{ marginTop: 8 }}
          />
          <TextField
            label="Description (optional)"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={profileDescription}
            onChange={e => setProfileDescription(e.target.value)}
            placeholder="e.g., STIG for production web tier — FIPS disabled due to legacy TLS, SSH timeout set to 900"
            helperText="Capture institutional knowledge about why rules were included or excluded"
            style={{ marginTop: 16 }}
          />
          {saveError && (
            <Typography color="error" variant="body2" style={{ marginTop: 8 }}>
              {saveError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!profileName || saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                const enabledSelections = failedFindings
                  .filter(f => selections[f.ruleId]?.enabled)
                  .map(f => ({
                    ruleId: f.ruleId,
                    enabled: true,
                    parameters: selections[f.ruleId].parameters,
                  }));

                await api.saveRemediationProfile({
                  name: profileName,
                  description: profileDescription,
                  complianceProfileId: 'rhel9-stig',
                  selections: enabledSelections,
                });

                setSaveDialogOpen(false);
                setProfileName('');
                setProfileDescription('');
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Failed to save remediation');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
