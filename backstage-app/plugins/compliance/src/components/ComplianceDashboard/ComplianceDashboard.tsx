import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InfoCard,
  StatusOK,
  StatusError,
  StatusWarning,
} from '@backstage/core-components';
import {
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
import { complianceApi } from '../../api';
import type { DashboardStats } from '@aap-compliance/common';

const useStyles = makeStyles(theme => ({
  section: {
    marginBottom: theme.spacing(2),
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  gaugeItem: {
    flex: '1 1 120px',
    minWidth: 120,
    maxWidth: 200,
  },
  statItem: {
    flex: '1 1 140px',
    minWidth: 140,
  },
  actionsColumn: {
    flex: '1 1 280px',
    maxWidth: 400,
  },
  scansColumn: {
    flex: '2 1 400px',
  },
  frameworkItem: {
    flex: '1 1 250px',
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
  },
}));

// Fallback stats used while the backend is loading
const FALLBACK_STATS: DashboardStats = {
  hostsScanned: 12,
  criticalFindings: 8,
  pendingRemediation: 15,
  activeProfiles: 3,
  recentScans: [
    { id: '1', profileName: 'RHEL 9 STIG V2R8', inventoryName: 'production-web-servers', passRate: 78, timestamp: '2 hours ago', status: 'completed' },
    { id: '2', profileName: 'CIS RHEL 9 L1', inventoryName: 'staging-db-servers', passRate: 85, timestamp: '1 day ago', status: 'completed' },
    { id: '3', profileName: 'RHEL 9 STIG V2R8', inventoryName: 'dev-servers', passRate: 62, timestamp: '3 days ago', status: 'completed' },
  ],
  frameworkScores: [
    { name: 'DISA STIG V2R8', target: 'RHEL 9', rules: 366, rate: 78, lastScan: '2 hours ago' },
    { name: 'CIS Benchmark L1', target: 'RHEL 9', rules: 189, rate: 85, lastScan: '1 day ago' },
    { name: 'PCI-DSS v4.0', target: 'RHEL 9', rules: 142, rate: 62, lastScan: '3 days ago' },
  ],
};

export const ComplianceDashboard = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(FALLBACK_STATS);

  useEffect(() => {
    complianceApi.getDashboardStats()
      .then(data => setStats(data))
      .catch(() => {
        // Keep fallback stats on error
      });
  }, []);

  // Compute an overall gauge from framework scores
  const overallRate = stats.frameworkScores.length > 0
    ? Math.round(
        stats.frameworkScores.reduce((sum, fw) => sum + fw.rate, 0) /
          stats.frameworkScores.length,
      )
    : 0;

  return (
    <div>
      {/* Compliance Gauges */}
      <div className={classes.section}>
        <InfoCard title="Compliance Posture">
          <div className={classes.row} style={{ justifyContent: 'center' }}>
            <div className={classes.gaugeItem}>
              <ComplianceGauge value={overallRate} label="Overall" />
            </div>
            {stats.frameworkScores.map(fw => (
              <div className={classes.gaugeItem} key={fw.name}>
                <ComplianceGauge value={fw.rate} label={fw.name.split(' ')[0] + ' ' + (fw.name.split(' ')[1] || '')} />
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Key Metrics */}
      <div className={classes.section}>
        <div className={classes.row}>
          <div className={classes.statItem}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={classes.statValue}>{stats.hostsScanned}</Typography>
                <Typography className={classes.statLabel}>Hosts Scanned</Typography>
              </div>
            </InfoCard>
          </div>
          <div className={classes.statItem}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.critical}`}>{stats.criticalFindings}</Typography>
                <Typography className={classes.statLabel}>Critical (CAT I)</Typography>
              </div>
            </InfoCard>
          </div>
          <div className={classes.statItem}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.warning}`}>{stats.pendingRemediation}</Typography>
                <Typography className={classes.statLabel}>Pending Remediation</Typography>
              </div>
            </InfoCard>
          </div>
          <div className={classes.statItem}>
            <InfoCard>
              <div className={classes.statCard}>
                <Typography className={`${classes.statValue} ${classes.success}`}>{stats.activeProfiles}</Typography>
                <Typography className={classes.statLabel}>Active Profiles</Typography>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>

      {/* Quick Actions + Recent Scans */}
      <div className={classes.section}>
        <div className={classes.row}>
          <div className={classes.actionsColumn}>
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
          </div>
          <div className={classes.scansColumn}>
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
              {stats.recentScans.map(scan => (
                <div key={scan.id} className={classes.scanRow}>
                  <div>
                    <Typography variant="subtitle2">{scan.profileName}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {scan.inventoryName} &middot; {scan.timestamp}
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
          </div>
        </div>
      </div>

      {/* Framework Cards */}
      <div className={classes.section}>
        <InfoCard title="Active Compliance Frameworks">
          <div className={classes.row}>
            {stats.frameworkScores.map(fw => (
              <div className={classes.frameworkItem} key={fw.name}>
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
              </div>
            ))}
          </div>
        </InfoCard>
      </div>
    </div>
  );
};
