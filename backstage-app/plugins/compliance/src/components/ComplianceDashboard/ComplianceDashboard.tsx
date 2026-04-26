import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  Page,
  Content,
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
import SecurityIcon from '@material-ui/icons/Security';
import AssessmentIcon from '@material-ui/icons/Assessment';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import HistoryIcon from '@material-ui/icons/History';

const useStyles = makeStyles(theme => ({
  statCard: {
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(0.5),
  },
  passRate: {
    color: theme.palette.success?.main ?? '#4caf50',
  },
  failRate: {
    color: theme.palette.error?.main ?? '#f44336',
  },
  warningRate: {
    color: theme.palette.warning?.main ?? '#ff9800',
  },
  profileCard: {
    height: '100%',
  },
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
    height: 8,
    borderRadius: 4,
  },
  recentScanRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
}));

const MOCK_STATS = {
  hostsScanned: 12,
  complianceRate: 72,
  criticalFindings: 8,
  lastScanTime: '2 hours ago',
  activePolicies: 3,
  pendingRemediations: 15,
};

const MOCK_RECENT_SCANS = [
  {
    id: 1,
    profile: 'RHEL 9 STIG V2R8',
    hosts: 'production-web-servers',
    passRate: 78,
    timestamp: '2 hours ago',
    status: 'completed' as const,
  },
  {
    id: 2,
    profile: 'CIS RHEL 9 L1',
    hosts: 'staging-db-servers',
    passRate: 85,
    timestamp: '1 day ago',
    status: 'completed' as const,
  },
  {
    id: 3,
    profile: 'RHEL 9 STIG V2R8',
    hosts: 'dev-servers',
    passRate: 62,
    timestamp: '3 days ago',
    status: 'completed' as const,
  },
];

export const ComplianceDashboard = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  return (
    <Page themeId="tool">
      <Header
        title="Compliance"
        subtitle="Scan, review, and remediate infrastructure compliance"
      />
      <Content>
        <Grid container spacing={3}>
          {/* Stats Row */}
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.passRate}`}>
                  {MOCK_STATS.complianceRate}%
                </Typography>
                <Typography className={classes.statLabel}>
                  Overall Compliance
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={MOCK_STATS.complianceRate}
                  className={classes.complianceBar}
                  style={{ marginTop: 8 }}
                />
              </div>
            </InfoCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={classes.statValue}>
                  {MOCK_STATS.hostsScanned}
                </Typography>
                <Typography className={classes.statLabel}>
                  Hosts Scanned
                </Typography>
              </div>
            </InfoCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.failRate}`}>
                  {MOCK_STATS.criticalFindings}
                </Typography>
                <Typography className={classes.statLabel}>
                  Critical Findings (CAT I)
                </Typography>
              </div>
            </InfoCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.warningRate}`}>
                  {MOCK_STATS.pendingRemediations}
                </Typography>
                <Typography className={classes.statLabel}>
                  Pending Remediations
                </Typography>
              </div>
            </InfoCard>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <InfoCard title="Quick Actions">
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate('scan')}>
                  <div className={classes.quickAction}>
                    <PlayCircleFilledIcon className={classes.actionIcon} />
                    <div>
                      <Typography variant="subtitle1">New Scan</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Launch a compliance scan against your infrastructure
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
                      <Typography variant="subtitle1">
                        Browse Profiles
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        View available compliance frameworks and profiles
                      </Typography>
                    </div>
                  </div>
                </CardActionArea>
              </Card>
              <Box mt={1} />
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate('results/42')}>
                  <div className={classes.quickAction}>
                    <AssessmentIcon className={classes.actionIcon} />
                    <div>
                      <Typography variant="subtitle1">
                        Latest Results
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        View most recent scan results and findings
                      </Typography>
                    </div>
                  </div>
                </CardActionArea>
              </Card>
            </InfoCard>
          </Grid>

          {/* Recent Scans */}
          <Grid item xs={12} md={8}>
            <InfoCard
              title="Recent Scans"
              subheader="Latest compliance scan results"
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
              {MOCK_RECENT_SCANS.map(scan => (
                <div key={scan.id} className={classes.recentScanRow}>
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
                    <Typography variant="subtitle2">
                      {scan.passRate}% pass
                    </Typography>
                  </div>
                </div>
              ))}
            </InfoCard>
          </Grid>

          {/* Active Compliance Profiles */}
          <Grid item xs={12}>
            <InfoCard
              title="Active Compliance Profiles"
              subheader="Profiles configured for your environment"
            >
              <Grid container spacing={2}>
                {[
                  {
                    name: 'DISA STIG V2R8',
                    target: 'RHEL 9',
                    rules: 366,
                    lastScan: '2 hours ago',
                    rate: 78,
                  },
                  {
                    name: 'CIS Benchmark L1',
                    target: 'RHEL 9',
                    rules: 189,
                    lastScan: '1 day ago',
                    rate: 85,
                  },
                  {
                    name: 'PCI-DSS v4.0',
                    target: 'RHEL 9',
                    rules: 142,
                    lastScan: '3 days ago',
                    rate: 62,
                  },
                ].map(profile => (
                  <Grid item xs={12} sm={6} md={4} key={profile.name}>
                    <Card variant="outlined" className={classes.profileCard}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {profile.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {profile.target} &middot; {profile.rules} rules
                        </Typography>
                        <Box mt={2}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={0.5}
                          >
                            <Typography variant="caption">
                              Compliance
                            </Typography>
                            <Typography variant="caption">
                              {profile.rate}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={profile.rate}
                            className={classes.complianceBar}
                            color={
                              profile.rate >= 80 ? 'primary' : 'secondary'
                            }
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          style={{ marginTop: 8, display: 'block' }}
                        >
                          Last scan: {profile.lastScan}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </InfoCard>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
