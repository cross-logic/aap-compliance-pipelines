import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  makeStyles,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import SettingsIcon from '@material-ui/icons/Settings';
import { complianceApiRef } from '../../api';

import type {
  ComplianceCartridge,
  SaveCartridgeRequest,
} from '@aap-compliance/common';

const useStyles = makeStyles(theme => ({
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
  },
  frameworkChip: {
    fontWeight: 600,
  },
  dialogContent: {
    minWidth: 500,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    paddingTop: theme.spacing(1),
  },
}));

const FRAMEWORK_OPTIONS = [
  { value: 'DISA_STIG', label: 'DISA STIG' },
  { value: 'CIS', label: 'CIS Benchmark' },
  { value: 'PCI_DSS', label: 'PCI-DSS' },
  { value: 'HIPAA', label: 'HIPAA' },
  { value: 'NIST_800_53', label: 'NIST 800-53' },
];

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
}

interface ExecutionEnvironment {
  id: number;
  name: string;
  image: string;
}

const EMPTY_FORM: SaveCartridgeRequest = {
  displayName: '',
  description: '',
  framework: 'DISA_STIG',
  version: '',
  platform: '',
  workflowTemplateId: null,
  eeId: null,
  remediationPlaybookPath: '',
  scanTags: '',
};

export const CartridgeSettings = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(complianceApiRef);

  // Admin permission gate: reuse catalogEntityCreatePermission following
  // the upstream Ansible Portal pattern. The entire settings page is
  // restricted to users with admin/create permissions. When RBAC is not
  // configured, this defaults to allowed.
  const { allowed: isAdmin, loading: permissionLoading } = usePermission({
    permission: catalogEntityCreatePermission,
  });

  const [cartridges, setCartridges] = useState<ComplianceCartridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ComplianceCartridge | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SaveCartridgeRequest>({ ...EMPTY_FORM });

  // Controller resources for dropdowns
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [executionEnvironments, setExecutionEnvironments] = useState<ExecutionEnvironment[]>([]);

  const loadCartridges = useCallback(async () => {
    try {
      const data = await api.getCartridges();
      setCartridges(data);
    } catch {
      // keep empty on error
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadControllerResources = useCallback(async () => {
    try {
      const [wfts, ees] = await Promise.all([
        api.getControllerWorkflowTemplates(),
        api.getControllerExecutionEnvironments(),
      ]);
      setWorkflowTemplates(wfts);
      setExecutionEnvironments(ees);
    } catch {
      // fallback: empty dropdowns
    }
  }, [api]);

  useEffect(() => {
    loadCartridges();
  }, [loadCartridges]);

  const handleOpenDialog = () => {
    setForm({ ...EMPTY_FORM });
    loadControllerResources();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveCartridge(form);
      handleCloseDialog();
      await loadCartridges();
    } catch {
      // error handling would go here
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCartridge(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadCartridges();
    } catch {
      // error handling would go here
    }
  };

  const handleDeleteClick = (cartridge: ComplianceCartridge) => {
    setDeleteTarget(cartridge);
    setDeleteDialogOpen(true);
  };

  const updateForm = (field: keyof SaveCartridgeRequest, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getFrameworkLabel = (value: string) => {
    return FRAMEWORK_OPTIONS.find(f => f.value === value)?.label ?? value;
  };

  const getWorkflowTemplateName = (id: number | null) => {
    if (id === null) return '--';
    return workflowTemplates.find(t => t.id === id)?.name ?? `ID ${id}`;
  };

  const getEeName = (id: number | null) => {
    if (id === null) return '--';
    return executionEnvironments.find(e => e.id === id)?.name ?? `ID ${id}`;
  };

  if (permissionLoading || loading) {
    return <Progress />;
  }

  if (!isAdmin) {
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
          <Typography>Settings</Typography>
        </Breadcrumbs>
        <Box mt={3} />
        <InfoCard title="Access Denied">
          <Typography variant="body1">
            You do not have permission to manage compliance cartridges.
            Contact your administrator if you need access.
          </Typography>
        </InfoCard>
      </>
    );
  }

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
        <Typography>Settings</Typography>
      </Breadcrumbs>

      <Box mt={3} />

      <InfoCard title="Cartridge Registry">
        <div className={classes.headerRow}>
          <Typography variant="body2" color="textSecondary">
            Map compliance frameworks to Controller workflow templates and execution environments.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Add Cartridge
          </Button>
        </div>

        {cartridges.length === 0 ? (
          <div className={classes.emptyState}>
            <SettingsIcon style={{ fontSize: 64, color: '#6A6E73', marginBottom: 16 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No compliance cartridges configured
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              A cartridge maps a compliance framework (e.g., DISA STIG, CIS) to an
              AAP Controller workflow template and execution environment. Add one to get started.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Add Your First Cartridge
            </Button>
          </div>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Framework</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Platform</TableCell>
                  <TableCell>Workflow Template ID</TableCell>
                  <TableCell>EE ID</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cartridges.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Typography variant="body2" style={{ fontWeight: 500 }}>
                        {c.displayName}
                      </Typography>
                      {c.description && (
                        <Typography variant="caption" color="textSecondary">
                          {c.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getFrameworkLabel(c.framework)}
                        size="small"
                        variant="outlined"
                        className={classes.frameworkChip}
                      />
                    </TableCell>
                    <TableCell>{c.version || '--'}</TableCell>
                    <TableCell>{c.platform || '--'}</TableCell>
                    <TableCell>{c.workflowTemplateId ?? '--'}</TableCell>
                    <TableCell>{c.eeId ?? '--'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(c)}
                        aria-label="delete cartridge"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </InfoCard>

      {/* ── Add Cartridge Dialog ──────────────────────────────────────── */}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Cartridge</DialogTitle>
        <DialogContent>
          <div className={classes.dialogContent}>
            <TextField
              label="Display Name"
              variant="outlined"
              fullWidth
              required
              value={form.displayName}
              onChange={e => updateForm('displayName', e.target.value)}
              className={classes.formField}
            />

            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
              className={classes.formField}
            />

            <FormControl variant="outlined" fullWidth className={classes.formField}>
              <InputLabel>Framework</InputLabel>
              <Select
                value={form.framework}
                onChange={e => updateForm('framework', e.target.value)}
                label="Framework"
              >
                {FRAMEWORK_OPTIONS.map(f => (
                  <MenuItem key={f.value} value={f.value}>
                    {f.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Version"
              variant="outlined"
              fullWidth
              placeholder="e.g., V2R8"
              value={form.version}
              onChange={e => updateForm('version', e.target.value)}
              className={classes.formField}
            />

            <TextField
              label="Platform"
              variant="outlined"
              fullWidth
              placeholder="e.g., RHEL 9"
              value={form.platform}
              onChange={e => updateForm('platform', e.target.value)}
              className={classes.formField}
            />

            <FormControl variant="outlined" fullWidth className={classes.formField}>
              <InputLabel>Workflow Template</InputLabel>
              <Select
                value={form.workflowTemplateId ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  updateForm('workflowTemplateId', val === '' ? null : Number(val));
                }}
                label="Workflow Template"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {workflowTemplates.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl variant="outlined" fullWidth className={classes.formField}>
              <InputLabel>Execution Environment</InputLabel>
              <Select
                value={form.eeId ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  updateForm('eeId', val === '' ? null : Number(val));
                }}
                label="Execution Environment"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {executionEnvironments.map(ee => (
                  <MenuItem key={ee.id} value={ee.id}>
                    {ee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Remediation Playbook Path"
              variant="outlined"
              fullWidth
              placeholder="/usr/share/scap-security-guide/ansible/rhel9-playbook-stig.yml"
              value={form.remediationPlaybookPath}
              onChange={e => updateForm('remediationPlaybookPath', e.target.value)}
              helperText="Path to the CaC remediation playbook inside the Execution Environment"
              className={classes.formField}
            />

            <TextField
              label="Scan Tags"
              variant="outlined"
              fullWidth
              placeholder="stig,rhel9,cat_i"
              value={form.scanTags}
              onChange={e => updateForm('scanTags', e.target.value)}
              helperText="Comma-separated tags for filtering scanning rules"
              className={classes.formField}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving || !form.displayName || !form.framework}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Cartridge</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the cartridge{' '}
            <strong>{deleteTarget?.displayName}</strong>? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
