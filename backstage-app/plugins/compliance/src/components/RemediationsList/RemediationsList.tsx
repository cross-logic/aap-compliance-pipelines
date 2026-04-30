import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InfoCard,
  Progress,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  makeStyles,
} from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import VisibilityIcon from '@material-ui/icons/Visibility';
import SettingsIcon from '@material-ui/icons/Settings';
import AddIcon from '@material-ui/icons/Add';
import { complianceApiRef } from '../../api';
import type { RemediationProfile } from '@aap-compliance/common';

const useStyles = makeStyles(theme => ({
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  nameCell: {
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(0.5),
  },
}));

export const RemediationsList = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);
  const [remediations, setRemediations] = useState<RemediationProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRemediationProfiles()
      .then(data => setRemediations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <Progress />;

  return (
    <InfoCard title="Remediations">
      <div className={classes.headerRow}>
        <Typography variant="body2" color="textSecondary">
          Saved remediations capture your rule selections, parameter overrides, and scope
          choices. Re-apply them to new scans or share across teams.
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/compliance/scan')}
        >
          New Scan
        </Button>
      </div>

      {remediations.length === 0 ? (
        <div className={classes.emptyState}>
          <SettingsIcon style={{ fontSize: 64, color: '#6A6E73', marginBottom: 16 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No saved remediations
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Run a compliance scan, review the findings, then save your rule selections
            as a remediation. Saved remediations appear here so you can re-apply or
            modify them later.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/compliance/scan')}
          >
            Launch a Scan
          </Button>
        </div>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Compliance Profile</TableCell>
                <TableCell>Rules</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {remediations.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Typography variant="body2" className={classes.nameCell}>
                      {r.name}
                    </Typography>
                    {r.description && (
                      <Typography variant="caption" color="textSecondary">
                        {r.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.complianceProfileId}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {r.selections.filter(s => s.enabled).length} selected
                  </TableCell>
                  <TableCell>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className={classes.actions}>
                      <IconButton
                        size="small"
                        title="View details"
                        onClick={() => {/* future: open detail view */}}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Apply this remediation"
                        onClick={() => {/* future: re-apply flow */}}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </InfoCard>
  );
};
