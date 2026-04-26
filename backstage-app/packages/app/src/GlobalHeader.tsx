import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from '@material-ui/core';
import { makeStyles, alpha } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import SecurityIcon from '@material-ui/icons/Security';

const useStyles = makeStyles(theme => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor:
      theme.palette.type === 'dark'
        ? theme.palette.grey[900]
        : theme.palette.primary.main,
    color:
      theme.palette.type === 'dark'
        ? theme.palette.common.white
        : theme.palette.primary.contrastText,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  toolbar: {
    minHeight: 48,
  },
  title: {
    flexGrow: 0,
    marginRight: theme.spacing(2),
    color: 'inherit',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    '&:hover': {
      textDecoration: 'none',
    },
  },
  spacer: {
    flexGrow: 1,
  },
  subtitle: {
    opacity: 0.8,
    fontSize: '0.85rem',
  },
}));

export const GlobalHeader = () => {
  const classes = useStyles();

  return (
    <AppBar position="sticky" className={classes.appBar}>
      <Toolbar className={classes.toolbar}>
        <Link to="/" className={classes.title}>
          <SecurityIcon />
          <Typography variant="h6">Ansible Compliance</Typography>
        </Link>
        <Typography className={classes.subtitle}>
          Automation Platform
        </Typography>
        <div className={classes.spacer} />
      </Toolbar>
    </AppBar>
  );
};
