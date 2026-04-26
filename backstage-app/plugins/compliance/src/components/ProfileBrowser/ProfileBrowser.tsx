import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Header,
  Page,
  Content,
  InfoCard,
  Breadcrumbs,
} from '@backstage/core-components';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  makeStyles,
} from '@material-ui/core';
import SecurityIcon from '@material-ui/icons/Security';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import PolicyIcon from '@material-ui/icons/Policy';

const useStyles = makeStyles(theme => ({
  frameworkChip: {
    fontWeight: 600,
  },
  profileDetail: {
    marginTop: theme.spacing(2),
  },
  ruleCategory: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
}));

const PROFILES = [
  {
    id: 'rhel9-stig',
    name: 'DISA STIG for RHEL 9',
    framework: 'DISA STIG',
    version: 'V2R8',
    description:
      'Security Technical Implementation Guide for Red Hat Enterprise Linux 9. Required for all DoD information systems and DoD contractor systems processing DoD information.',
    applicableOs: ['RHEL 9'],
    ruleCount: 366,
    lastUpdated: '2025-10-25',
    source: 'ComplianceAsCode/content',
    categories: [
      { name: 'Access Control', count: 48 },
      { name: 'Audit and Accountability', count: 62 },
      { name: 'Authentication', count: 35 },
      { name: 'Configuration Management', count: 44 },
      { name: 'Identification', count: 18 },
      { name: 'System and Communications Protection', count: 52 },
      { name: 'System and Information Integrity', count: 41 },
      { name: 'Other', count: 66 },
    ],
    severity: { catI: 24, catII: 280, catIII: 62 },
    icon: <SecurityIcon />,
  },
  {
    id: 'rhel9-cis-l1',
    name: 'CIS Benchmark RHEL 9 — Level 1 Server',
    framework: 'CIS',
    version: '1.0.0',
    description:
      'CIS Benchmark Level 1 provides a baseline security configuration. Items in this profile are intended to be practical and prudent, providing a clear security benefit without overly inhibiting the system utility.',
    applicableOs: ['RHEL 9'],
    ruleCount: 189,
    lastUpdated: '2025-06-15',
    source: 'ComplianceAsCode/content',
    categories: [
      { name: 'Initial Setup', count: 32 },
      { name: 'Services', count: 24 },
      { name: 'Network Configuration', count: 28 },
      { name: 'Logging and Auditing', count: 38 },
      { name: 'Access, Authentication, Authorization', count: 42 },
      { name: 'System Maintenance', count: 25 },
    ],
    severity: { catI: 12, catII: 145, catIII: 32 },
    icon: <VerifiedUserIcon />,
  },
  {
    id: 'rhel9-pci-dss',
    name: 'PCI-DSS v4.0 for RHEL 9',
    framework: 'PCI-DSS',
    version: '4.0',
    description:
      'Payment Card Industry Data Security Standard v4.0. Required for all entities that store, process, or transmit cardholder data.',
    applicableOs: ['RHEL 9'],
    ruleCount: 142,
    lastUpdated: '2025-03-20',
    source: 'ComplianceAsCode/content',
    categories: [
      { name: 'Network Security', count: 22 },
      { name: 'Data Protection', count: 18 },
      { name: 'Vulnerability Management', count: 20 },
      { name: 'Access Control', count: 35 },
      { name: 'Monitoring and Testing', count: 28 },
      { name: 'Security Policy', count: 19 },
    ],
    severity: { catI: 18, catII: 98, catIII: 26 },
    icon: <PolicyIcon />,
  },
];

const frameworkColor: Record<string, 'primary' | 'secondary' | 'default'> = {
  'DISA STIG': 'secondary',
  CIS: 'primary',
  'PCI-DSS': 'default',
};

export const ProfileBrowser = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();

  const selectedProfile = profileId
    ? PROFILES.find(p => p.id === profileId)
    : undefined;

  if (selectedProfile) {
    return (
      <Page themeId="tool">
        <Header title={selectedProfile.name} subtitle={selectedProfile.framework} />
        <Content>
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
              onClick={() => navigate('/compliance/profiles/all')}
            >
              Profiles
            </Typography>
            <Typography>{selectedProfile.name}</Typography>
          </Breadcrumbs>

          <Box mt={3} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <InfoCard title="Overview">
                <Typography variant="body1" paragraph>
                  {selectedProfile.description}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">
                      Framework
                    </Typography>
                    <Typography variant="body1">
                      {selectedProfile.framework} {selectedProfile.version}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">
                      Applicable OS
                    </Typography>
                    <Typography variant="body1">
                      {selectedProfile.applicableOs.join(', ')}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {selectedProfile.lastUpdated}
                    </Typography>
                  </Grid>
                </Grid>
              </InfoCard>

              <Box mt={3} />

              <InfoCard title="Rule Categories">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Rules</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedProfile.categories.map(cat => (
                      <TableRow key={cat.name}>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell align="right">{cat.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfoCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <InfoCard title="Severity Distribution">
                <div className={classes.ruleCategory}>
                  <Chip label="CAT I — Critical" size="small" color="secondary" />
                  <Typography variant="subtitle2">
                    {selectedProfile.severity.catI}
                  </Typography>
                </div>
                <div className={classes.ruleCategory}>
                  <Chip label="CAT II — Medium" size="small" style={{ backgroundColor: '#ff9800', color: '#fff' }} />
                  <Typography variant="subtitle2">
                    {selectedProfile.severity.catII}
                  </Typography>
                </div>
                <div className={classes.ruleCategory}>
                  <Chip label="CAT III — Low" size="small" color="primary" />
                  <Typography variant="subtitle2">
                    {selectedProfile.severity.catIII}
                  </Typography>
                </div>
              </InfoCard>

              <Box mt={2} />

              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={() => navigate(`/compliance/scan?profile=${selectedProfile?.id ?? ''}`)}
              >
                Scan with this Profile
              </Button>
            </Grid>
          </Grid>
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Header
        title="Compliance Profiles"
        subtitle="Available compliance frameworks and security benchmarks"
      />
      <Content>
        <Breadcrumbs>
          <Typography
            color="primary"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/compliance')}
          >
            Compliance
          </Typography>
          <Typography>Profiles</Typography>
        </Breadcrumbs>

        <Box mt={3} />

        <Grid container spacing={3}>
          {PROFILES.map(profile => (
            <Grid item xs={12} sm={6} md={4} key={profile.id}>
              <Card variant="outlined" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent style={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" mb={1} gap={1}>
                    {profile.icon}
                    <Chip
                      label={profile.framework}
                      size="small"
                      color={frameworkColor[profile.framework] ?? 'default'}
                      className={classes.frameworkChip}
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {profile.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {profile.description.slice(0, 150)}...
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Typography variant="caption">
                      {profile.ruleCount} rules
                    </Typography>
                    <Typography variant="caption">
                      {profile.applicableOs.join(', ')}
                    </Typography>
                    <Typography variant="caption">
                      v{profile.version}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => navigate(`/compliance/profiles/${profile.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => navigate(`/compliance/scan?profile=${selectedProfile?.id ?? ''}`)}
                  >
                    Scan
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Content>
    </Page>
  );
};
