import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  InfoCard,
  Breadcrumbs,
  StatusWarning,
} from '@backstage/core-components';
import {
  Grid,
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
  makeStyles,
} from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import SaveIcon from '@material-ui/icons/Save';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import WarningIcon from '@material-ui/icons/Warning';
import type { Finding, FindingSeverity } from '@aap-compliance/common';
import { MOCK_FINDINGS } from '../ResultsViewer/mockFindings';

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
  severityChip: {
    fontWeight: 600,
    minWidth: 60,
  },
  catI: { backgroundColor: '#d32f2f', color: '#fff' },
  catII: { backgroundColor: '#ed6c02', color: '#fff' },
  catIII: { backgroundColor: '#0288d1', color: '#fff' },
  parameterPanel: {
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
  summaryCount: {
    display: 'flex',
    gap: theme.spacing(3),
  },
  bulkActions: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  disruptionWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.warning.main,
    fontSize: '0.75rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.5, 2),
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  impactText: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
    marginTop: 2,
  },
}));

interface SelectionState {
  enabled: boolean;
  expanded: boolean;
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
  const { jobId } = useParams<{ jobId: string }>();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');

  const failedFindings = useMemo(
    () => MOCK_FINDINGS.filter(f => f.status === 'fail'),
    [],
  );

  const [selections, setSelections] = useState<Record<string, SelectionState>>(() => {
    const initial: Record<string, SelectionState> = {};
    failedFindings.forEach(f => {
      initial[f.ruleId] = {
        enabled: f.disruption !== 'high',
        expanded: false,
        parameters: Object.fromEntries(
          f.parameters.map(p => [p.name, p.default]),
        ),
      };
    });
    return initial;
  });

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

  const updateParameter = (
    ruleId: string,
    paramName: string,
    value: string | number | boolean,
  ) => {
    setSelections(prev => ({
      ...prev,
      [ruleId]: {
        ...prev[ruleId],
        parameters: { ...prev[ruleId].parameters, [paramName]: value },
      },
    }));
  };

  const selectAll = () => {
    setSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k] = { ...updated[k], enabled: true };
      });
      return updated;
    });
  };

  const clearAll = () => {
    setSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k] = { ...updated[k], enabled: false };
      });
      return updated;
    });
  };

  const selectBySeverity = (severity: FindingSeverity) => {
    setSelections(prev => {
      const updated = { ...prev };
      failedFindings.forEach(f => {
        updated[f.ruleId] = {
          ...updated[f.ruleId],
          enabled: f.severity === severity,
        };
      });
      return updated;
    });
  };

  const enabledCount = Object.values(selections).filter(s => s.enabled).length;
  const disabledCount = Object.values(selections).filter(s => !s.enabled).length;

  const groupedByCategory = useMemo(() => {
    const groups: Record<FindingSeverity, Finding[]> = {
      CAT_I: [],
      CAT_II: [],
      CAT_III: [],
    };
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

  const renderFinding = (finding: Finding) => {
    const sel = selections[finding.ruleId];
    if (!sel) return null;

    return (
      <div
        key={finding.ruleId}
        className={`${classes.findingCard} ${
          sel.enabled ? classes.findingEnabled : classes.findingDisabled
        }`}
      >
        <div className={classes.findingHeader}>
          <Switch
            checked={sel.enabled}
            onChange={() => toggleFinding(finding.ruleId)}
            color="primary"
            size="small"
          />
          <Chip
            label={finding.stigId}
            size="small"
            variant="outlined"
            style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
          <div className={classes.titleGroup}>
            <Typography variant="subtitle2">{finding.title}</Typography>
            <Typography className={classes.impactText}>
              {finding.fixText.slice(0, 80)}
              {finding.fixText.length > 80 ? '...' : ''}
            </Typography>
          </div>

          {finding.disruption === 'high' && (
            <div className={classes.disruptionWarning}>
              <WarningIcon fontSize="small" />
              <span>High disruption</span>
            </div>
          )}

          {finding.parameters.length > 0 && (
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                toggleExpanded(finding.ruleId);
              }}
              title="Customize parameters"
            >
              {sel.expanded ? <ExpandLessIcon /> : <SettingsIcon fontSize="small" />}
            </IconButton>
          )}
        </div>

        {finding.parameters.length > 0 && (
          <Collapse in={sel.expanded}>
            <div className={classes.parameterPanel}>
              <Typography variant="caption" color="textSecondary" gutterBottom>
                Parameters
              </Typography>
              <Grid container spacing={2} style={{ marginTop: 4 }}>
                {finding.parameters.map(param => (
                  <Grid item xs={12} sm={6} key={param.name}>
                    {param.type === 'select' ? (
                      <FormControl variant="outlined" size="small" fullWidth>
                        <InputLabel>{param.label}</InputLabel>
                        <Select
                          value={sel.parameters[param.name] ?? param.default}
                          onChange={e =>
                            updateParameter(
                              finding.ruleId,
                              param.name,
                              e.target.value as string,
                            )
                          }
                          label={param.label}
                        >
                          {param.options?.map(opt => (
                            <MenuItem key={String(opt.value)} value={opt.value}>
                              {opt.label}
                            </MenuItem>
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
                        onChange={e =>
                          updateParameter(
                            finding.ruleId,
                            param.name,
                            param.type === 'number'
                              ? Number(e.target.value)
                              : e.target.value,
                          )
                        }
                        helperText={param.description}
                      />
                    )}
                  </Grid>
                ))}
              </Grid>
            </div>
          </Collapse>
        )}
      </div>
    );
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
          <Typography>Remediation Profile</Typography>
        </Breadcrumbs>

        <Box mt={3} />

        {/* Summary Bar */}
        <div className={classes.summaryBar}>
          <div className={classes.summaryCount}>
            <Typography variant="body1">
              <strong>{failedFindings.length}</strong> findings
            </Typography>
            <Typography variant="body1" style={{ color: '#4caf50' }}>
              <strong>{enabledCount}</strong> selected
            </Typography>
            <Typography variant="body1" color="textSecondary">
              <strong>{disabledCount}</strong> skipped
            </Typography>
          </div>
          <div className={classes.bulkActions}>
            <Button size="small" variant="outlined" onClick={selectAll}>
              Select All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => selectBySeverity('CAT_I')}
            >
              CAT I Only
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSelections(prev => {
                  const updated = { ...prev };
                  failedFindings.forEach(f => {
                    updated[f.ruleId] = {
                      ...updated[f.ruleId],
                      enabled: f.severity === 'CAT_I' || f.severity === 'CAT_II',
                    };
                  });
                  return updated;
                });
              }}
            >
              CAT I + II
            </Button>
            <Button size="small" variant="outlined" onClick={clearAll}>
              Clear All
            </Button>
          </div>
        </div>

        {/* Findings by Severity */}
        {(['CAT_I', 'CAT_II', 'CAT_III'] as FindingSeverity[]).map(severity => {
          const group = groupedByCategory[severity];
          if (group.length === 0) return null;
          const groupEnabled = group.filter(
            f => selections[f.ruleId]?.enabled,
          ).length;

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
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
          >
            Save as Profile
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={() => navigate(`/compliance/execute/${jobId}`)}
            disabled={enabledCount === 0}
          >
            Apply Remediation ({enabledCount} rules)
          </Button>
        </Box>

        {/* Save Profile Dialog */}
        <Dialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Save Remediation Profile</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              Save your selections and parameter customizations as a reusable
              profile. This profile can be applied to future scans without
              re-configuring each rule.
            </Typography>
            <TextField
              label="Profile Name"
              variant="outlined"
              fullWidth
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="e.g., production-web-servers-stig-v2r8"
              style={{ marginTop: 8 }}
            />
            <TextField
              label="Description (optional)"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              placeholder="e.g., STIG profile for production web tier — FIPS disabled due to legacy TLS requirements"
              style={{ marginTop: 16 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSaveDialogOpen(false);
                // TODO: Persist profile
              }}
              disabled={!profileName}
            >
              Save Profile
            </Button>
          </DialogActions>
        </Dialog>
    </>
  );
};
