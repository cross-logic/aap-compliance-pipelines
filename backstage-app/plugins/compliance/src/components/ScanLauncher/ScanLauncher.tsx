import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  Page,
  Content,
  InfoCard,
  Breadcrumbs,
  Progress,
} from '@backstage/core-components';
import {
  Grid,
  Typography,
  Button,
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

const PROFILES = [
  { id: 'rhel9-stig', name: 'DISA STIG for RHEL 9', version: 'V2R8', rules: 366 },
  { id: 'rhel9-cis-l1', name: 'CIS Benchmark RHEL 9 — Level 1', version: '1.0.0', rules: 189 },
  { id: 'rhel9-pci-dss', name: 'PCI-DSS v4.0 for RHEL 9', version: '4.0', rules: 142 },
];

const INVENTORIES = [
  { id: 1, name: 'production-web-servers', hostCount: 24 },
  { id: 2, name: 'staging-db-servers', hostCount: 6 },
  { id: 3, name: 'dev-servers', hostCount: 8 },
  { id: 4, name: 'all-rhel9-hosts', hostCount: 38 },
];

const steps = ['Select Profile', 'Select Targets', 'Review & Launch'];

export const ScanLauncher = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedInventory, setSelectedInventory] = useState('');
  const [evaluateOnly, setEvaluateOnly] = useState(true);
  const [launching, setLaunching] = useState(false);

  const profile = PROFILES.find(p => p.id === selectedProfile);
  const inventory = INVENTORIES.find(i => i.id.toString() === selectedInventory);

  const handleLaunch = async () => {
    setLaunching(true);
    // Simulate launching — in real implementation, call ComplianceApiClient.launchJobTemplate()
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLaunching(false);
    // Navigate to results view with a mock job ID
    navigate('/compliance/results/42');
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
              {PROFILES.map(p => (
                <Grid item xs={12} sm={4} key={p.id}>
                  <Card
                    variant="outlined"
                    className={`${classes.profileOption} ${
                      selectedProfile === p.id ? classes.selectedProfile : ''
                    }`}
                    onClick={() => setSelectedProfile(p.id)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
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
                {INVENTORIES.map(inv => (
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
              helperText="Restrict scan to specific hosts or groups within the inventory"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={evaluateOnly}
                  onChange={e => setEvaluateOnly(e.target.checked)}
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
                disabled={!profile || !inventory}
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
    <Page themeId="tool">
      <Header title="New Compliance Scan" subtitle="Scan your infrastructure against a compliance profile" />
      <Content>
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
      </Content>
    </Page>
  );
};
