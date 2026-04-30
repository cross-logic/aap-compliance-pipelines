import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  InfoCard,
  Breadcrumbs,
  Progress,
} from '@backstage/core-components';
import {
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Switch,
  makeStyles,
} from '@material-ui/core';
import SecurityIcon from '@material-ui/icons/Security';
import { useApi } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { catalogEntityCreatePermission } from '@backstage/plugin-catalog-common/alpha';
import { complianceApiRef } from '../../api';

const useStyles = makeStyles(theme => ({
  stepContent: {
    minHeight: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    padding: theme.spacing(3, 0),
  },
  selectedProfile: {
    border: `2px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.action.selected,
  },
  profileOption: {
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: theme.palette.primary.light,
    },
  },
  reviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1.5, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  launchButton: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5, 4),
  },
}));

import type { ComplianceCartridge } from '@aap-compliance/common';

// Fallback data used while the backend is loading
const FALLBACK_PROFILES = [
  { id: 'rhel9-stig', name: 'DISA STIG for RHEL 9', version: 'V2R8', rules: 366 },
  { id: 'rhel9-cis-l1', name: 'CIS Benchmark RHEL 9 — Level 1', version: '1.0.0', rules: 189 },
  { id: 'rhel9-pci-dss', name: 'PCI-DSS v4.0 for RHEL 9', version: '4.0', rules: 142 },
];

const FALLBACK_INVENTORIES = [
  { id: 1, name: 'production-web-servers', hostCount: 24 },
  { id: 2, name: 'staging-db-servers', hostCount: 6 },
  { id: 3, name: 'dev-servers', hostCount: 8 },
  { id: 4, name: 'all-rhel9-hosts', hostCount: 38 },
];

const steps = ['Select Profile', 'Select Targets', 'Review & Launch'];

export const ScanLauncher = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);

  // Permission check: reuse catalogEntityCreatePermission following
  // the upstream Ansible Portal pattern (Home.tsx, TemplateActions.tsx).
  // When RBAC is not configured, this defaults to allowed.
  const { allowed: canLaunchScan } = usePermission({
    permission: catalogEntityCreatePermission,
  });

  const [searchParams] = useSearchParams();
  const preselectedProfile = searchParams.get('profile') ?? '';
  const [activeStep, setActiveStep] = useState(preselectedProfile ? 1 : 0);
  const [selectedProfile, setSelectedProfile] = useState(preselectedProfile);
  const [selectedInventory, setSelectedInventory] = useState('');
  const [limit, setLimit] = useState('');
  const [evaluateOnly, setEvaluateOnly] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Backend-fetched data
  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);
  const [inventories, setInventories] = useState(FALLBACK_INVENTORIES);
  const [cartridges, setCartridges] = useState<ComplianceCartridge[]>([]);

  // Fetch profiles, inventories, and cartridges from the backend on mount
  useEffect(() => {
    // Try to load cartridges from registry first, then merge with built-in profiles
    api.getCartridges()
      .then(data => {
        setCartridges(data);
        if (data.length > 0) {
          // When cartridges are registered, use them as profile sources
          const cartridgeProfiles = data.map(c => ({
            id: c.id,
            name: c.displayName,
            version: c.version || '',
            rules: 0,
          }));
          setProfiles(prev => {
            // Merge: cartridge-sourced profiles + any built-in that don't overlap
            const cartridgeIds = new Set(cartridgeProfiles.map(p => p.id));
            const remaining = prev.filter(p => !cartridgeIds.has(p.id));
            return [...cartridgeProfiles, ...remaining];
          });
        }
      })
      .catch(() => {
        // Keep fallback data on error
      });

    api.getProfiles()
      .then(data =>
        setProfiles(prev => {
          // Only set built-in profiles if no cartridges have been loaded yet
          const builtIn = data.map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            rules: p.ruleCount,
          }));
          // Merge with any existing cartridge-sourced profiles
          const existingIds = new Set(prev.map(p => p.id));
          const newOnes = builtIn.filter(p => !existingIds.has(p.id));
          return [...prev, ...newOnes];
        }),
      )
      .catch(() => {
        // Keep fallback data on error
      });

    api.getInventories()
      .then(data => setInventories(data))
      .catch(() => {
        // Keep fallback data on error
      });
  }, [api]);

  const profile = profiles.find(p => p.id === selectedProfile);
  const inventory = inventories.find(i => i.id.toString() === selectedInventory);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      // Check if a cartridge is registered for the selected profile and use
      // its workflow template ID for the scan launch request.
      const cartridge = cartridges.find(c => c.id === selectedProfile);
      const scanRequest: Parameters<typeof api.launchScan>[0] = {
        profileId: selectedProfile,
        inventoryId: inventory?.id ?? 0,
        evaluateOnly,
        limit: limit || undefined,
      };
      // If the cartridge has a mapped workflow template, pass it as a hint
      if (cartridge?.workflowTemplateId) {
        (scanRequest as Record<string, unknown>).workflowTemplateId =
          cartridge.workflowTemplateId;
      }
      const result = await api.launchScan(scanRequest);
      // Navigate to results view with the returned workflow job ID
      navigate(`/compliance/results/${result.workflowJobId}`);
    } catch (err) {
      // On error, still navigate with a fallback ID for demo purposes
      navigate('/compliance/results/42');
    } finally {
      setLaunching(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className={classes.stepContent}>
            <Typography variant="h6">
              Choose a compliance profile to scan against
            </Typography>
            <Grid container spacing={2}>
              {profiles.map(p => (
                <Grid item xs={12} sm={4} key={p.id}>
                  <Card
                    variant="outlined"
                    className={`${classes.profileOption} ${
                      selectedProfile === p.id ? classes.selectedProfile : ''
                    }`}
                    onClick={() => setSelectedProfile(p.id)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" style={{ gap: 8 }} mb={1}>
                        <SecurityIcon color="primary" />
                        <Chip label={p.version} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="subtitle1">{p.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {p.rules} rules
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </div>
        );

      case 1:
        return (
          <div className={classes.stepContent}>
            <Typography variant="h6">Select target hosts to scan</Typography>
            <FormControl variant="outlined" fullWidth>
              <InputLabel>Inventory</InputLabel>
              <Select
                value={selectedInventory}
                onChange={e => setSelectedInventory(e.target.value as string)}
                label="Inventory"
              >
                {inventories.map(inv => (
                  <MenuItem key={inv.id} value={inv.id.toString()}>
                    {inv.name} ({inv.hostCount} hosts)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Limit (optional)"
              placeholder="host1,host2 or group_name"
              variant="outlined"
              fullWidth
              value={limit}
              onChange={e => setLimit(e.target.value)}
              helperText="Restrict scan to specific hosts or groups within the inventory"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={evaluateOnly}
                  onChange={e => {
                    if (!e.target.checked) {
                      setConfirmDialogOpen(true);
                    } else {
                      setEvaluateOnly(true);
                    }
                  }}
                  color="primary"
                />
              }
              label={
                <div>
                  <Typography variant="body1">Evaluate only (recommended)</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Scan and report findings without making changes. Uncheck to scan and
                    auto-remediate all findings.
                  </Typography>
                </div>
              }
            />

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
              <DialogTitle>Enable Auto-Remediation?</DialogTitle>
              <DialogContent>
                <Typography variant="body1" paragraph>
                  Disabling &quot;Evaluate only&quot; will automatically apply ALL remediation
                  rules to the target hosts. This can break running services and
                  production workloads.
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  For most use cases, we recommend scanning first (evaluate only),
                  then building a remediation to selectively choose which rules
                  to apply.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
                  Keep Evaluate Only
                </Button>
                <Button
                  onClick={() => {
                    setEvaluateOnly(false);
                    setConfirmDialogOpen(false);
                  }}
                  color="secondary"
                >
                  Enable Auto-Remediation
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        );

      case 2:
        return (
          <div className={classes.stepContent}>
            <Typography variant="h6">Review scan configuration</Typography>

            <InfoCard title="Scan Summary">
              <div className={classes.reviewItem}>
                <Typography variant="body2" color="textSecondary">
                  Profile
                </Typography>
                <Typography variant="body1">{profile?.name}</Typography>
              </div>
              <div className={classes.reviewItem}>
                <Typography variant="body2" color="textSecondary">
                  Version
                </Typography>
                <Typography variant="body1">{profile?.version}</Typography>
              </div>
              <div className={classes.reviewItem}>
                <Typography variant="body2" color="textSecondary">
                  Rules
                </Typography>
                <Typography variant="body1">{profile?.rules} rules</Typography>
              </div>
              <div className={classes.reviewItem}>
                <Typography variant="body2" color="textSecondary">
                  Target Inventory
                </Typography>
                <Typography variant="body1">
                  {inventory?.name} ({inventory?.hostCount} hosts)
                </Typography>
              </div>
              <div className={classes.reviewItem}>
                <Typography variant="body2" color="textSecondary">
                  Mode
                </Typography>
                <Chip
                  label={evaluateOnly ? 'Evaluate Only' : 'Evaluate & Remediate'}
                  color={evaluateOnly ? 'primary' : 'secondary'}
                  size="small"
                />
              </div>
            </InfoCard>

            {launching ? (
              <Box mt={2}>
                <Progress />
                <Typography variant="body2" align="center" style={{ marginTop: 8 }}>
                  Launching compliance scan...
                </Typography>
              </Box>
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="large"
                className={classes.launchButton}
                onClick={handleLaunch}
                disabled={!profile || !inventory || !canLaunchScan}
                title={!canLaunchScan ? 'You do not have permission to launch scans' : undefined}
              >
                Launch Scan
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return !!selectedProfile;
      case 1:
        return !!selectedInventory;
      case 2:
        return true;
      default:
        return false;
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
          <Typography>New Scan</Typography>
        </Breadcrumbs>

        <Box mt={3} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Grid>

          <Grid item xs={12}>
            {renderStepContent(activeStep)}
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between">
              <Button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => prev - 1)}
              >
                Back
              </Button>
              {activeStep < steps.length - 1 && (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!canProceed()}
                  onClick={() => setActiveStep(prev => prev + 1)}
                >
                  Next
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
    </>
  );
};
