import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InfoCard,
  StatusOK,
  StatusError,
  StatusWarning,
} from '@backstage/core-components';
import {
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  LinearProgress,
  Chip,
  Box,
  makeStyles,
} from '@material-ui/core';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import SecurityIcon from '@material-ui/icons/Security';
import HistoryIcon from '@material-ui/icons/History';
import { ComplianceGauge } from './ComplianceGauge';

const useStyles = makeStyles(theme => ({
  section: {
    marginBottom: theme.spacing(2),
  },
  statCard: {
    textAlign: 'center',
    padding: theme.spacing(1.5),
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
    marginTop: theme.spacing(0.5),
  },
  critical: { color: '#C9190B' },
  warning: { color: '#F0AB00' },
  success: { color: '#3E8635' },
  quickAction: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
  },
  actionIcon: {
    fontSize: '2rem',
    color: theme.palette.primary.main,
  },
  complianceBar: {
    height: 6,
    borderRadius: 3,
  },
  scanRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
  frameworkCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
}));

const MOCK_SCANS = [
  { id: 1, profile: 'RHEL 9 STIG V2R8', hosts: 'production-web-servers', passRate: 78, timestamp: '2 hours ago' },
  { id: 2, profile: 'CIS RHEL 9 L1', hosts: 'staging-db-servers', passRate: 85, timestamp: '1 day ago' },
  { id: 3, profile: 'RHEL 9 STIG V2R8', hosts: 'dev-servers', passRate: 62, timestamp: '3 days ago' },
];

const FRAMEWORKS = [
  { name: 'DISA STIG V2R8', target: 'RHEL 9', rules: 366, rate: 78, lastScan: '2 hours ago' },
  { name: 'CIS Benchmark L1', target: 'RHEL 9', rules: 189, rate: 85, lastScan: '1 day ago' },
  { name: 'PCI-DSS v4.0', target: 'RHEL 9', rules: 142, rate: 62, lastScan: '3 days ago' },
];

export const ComplianceDashboard = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  return (
    <div>
      {/* Compliance Gauges */}
      <div className={classes.section}>
        <InfoCard title="Compliance Posture">
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={6} sm={3}>
              <ComplianceGauge value={72} label="Overall" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <ComplianceGauge value={78} label="DISA STIG" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <ComplianceGauge value={85} label="CIS L1" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <ComplianceGauge value={62} label="PCI-DSS" />
            </Grid>
          </Grid>
        </InfoCard>
      </div>

      {/* Key Metrics */}
      <div className={classes.section}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={classes.statValue}>12</Typography>
                <Typography className={classes.statLabel}>Hosts Scanned</Typography>
              </div>
            </InfoCard>
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.critical}`}>8</Typography>
                <Typography className={classes.statLabel}>Critical (CAT I)</Typography>
              </div>
            </InfoCard>
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.warning}`}>15</Typography>
                <Typography className={classes.statLabel}>Pending Remediation</Typography>
              </div>
            </InfoCard>
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.success}`}>3</Typography>
                <Typography className={classes.statLabel}>Active Profiles</Typography>
              </div>
            </InfoCard>
          </Grid>
        </Grid>
      </div>

      {/* Quick Actions + Recent Scans */}
      <div className={classes.section}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <InfoCard title="Quick Actions">
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate('scan')}>
                  <div className={classes.quickAction}>
                    <PlayCircleFilledIcon className={classes.actionIcon} />
                    <div>
                      <Typography variant="subtitle1">New Scan</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Scan infrastructure against a compliance profile
                      </Typography>
                    </div>
                  </div>
                </CardActionArea>
              </Card>
              <Box mt={1} />
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate('profiles/all')}>
                  <div className={classes.quickAction}>
                    <SecurityIcon className={classes.actionIcon} />
                    <div>
                      <Typography variant="subtitle1">Browse Profiles</Typography>
                      <Typography variant="body2" color="textSecondary">
                        View compliance frameworks and benchmarks
                      </Typography>
                    </div>
                  </div>
                </CardActionArea>
              </Card>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={8}>
            <InfoCard
              title="Recent Scans"
              action={
                <Chip
                  icon={<HistoryIcon />}
                  label="View All"
                  variant="outlined"
                  size="small"
                  clickable
                />
              }
            >
              {MOCK_SCANS.map(scan => (
                <div key={scan.id} className={classes.scanRow}>
                  <div>
                    <Typography variant="subtitle2">{scan.profile}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {scan.hosts} &middot; {scan.timestamp}
                    </Typography>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {scan.passRate >= 80 ? (
                      <StatusOK />
                    ) : scan.passRate >= 65 ? (
                      <StatusWarning />
                    ) : (
                      <StatusError />
                    )}
                    <Typography variant="subtitle2">{scan.passRate}%</Typography>
                  </div>
                </div>
              ))}
            </InfoCard>
          </Grid>
        </Grid>
      </div>

      {/* Framework Cards */}
      <div className={classes.section}>
        <InfoCard title="Active Compliance Frameworks">
          <Grid container spacing={2}>
            {FRAMEWORKS.map(fw => (
              <Grid item xs={12} sm={4} key={fw.name}>
                <Card variant="outlined" className={classes.frameworkCard}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{fw.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {fw.target} &middot; {fw.rules} rules
                    </Typography>
                    <Box mt={2}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption">Compliance</Typography>
                        <Typography variant="caption">{fw.rate}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={fw.rate}
                        className={classes.complianceBar}
                        color={fw.rate >= 80 ? 'primary' : 'secondary'}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={{ marginTop: 8, display: 'block' }}
                    >
                      Last scan: {fw.lastScan}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </InfoCard>
      </div>
    </div>
  );
};
