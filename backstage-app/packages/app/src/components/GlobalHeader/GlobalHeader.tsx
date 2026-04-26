import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Box,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import AccountCircle from '@material-ui/icons/AccountCircle';
import { makeStyles, alpha } from '@material-ui/core/styles';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const useStyles = makeStyles(theme => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: '#151515',
    color: '#ffffff',
    borderBottom: 'none',
  },
  toolbar: {
    minHeight: 64,
  },
  title: {
    flexGrow: 0,
    marginRight: theme.spacing(2),
    color: 'inherit',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'none',
    },
  },
  search: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor:
      theme.palette.type === 'dark'
        ? alpha(theme.palette.common.white, 0.1)
        : alpha(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor:
        theme.palette.type === 'dark'
          ? alpha(theme.palette.common.white, 0.15)
          : alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(1),
      width: 'auto',
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRoot: {
    color: 'inherit',
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create('width'),
    width: '100%',
    color: 'inherit',
    [theme.breakpoints.up('sm')]: {
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
  spacer: {
    flexGrow: 1,
  },
  iconButton: {
    marginLeft: theme.spacing(1),
    color: 'inherit',
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.1),
    },
  },
}));

export const GlobalHeader = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchValue.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <AppBar position="sticky" className={classes.appBar}>
      <Toolbar className={classes.toolbar}>
        <Link to="/" className={classes.title} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 192.3 146" width="24" height="18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#e00" d="M129,85c12.5,0,30.6-2.6,30.6-17.5c0-1.2,0-2.3-0.3-3.4l-7.4-32.4c-1.7-7.1-3.2-10.3-15.7-16.6C126.4,10.2,105.3,2,99,2c-5.8,0-7.5,7.5-14.4,7.5c-6.7,0-11.6-5.6-17.9-5.6c-6,0-9.9,4.1-12.9,12.5c0,0-8.4,23.7-9.5,27.2C44,44.3,44,45,44,45.5C44,54.8,80.3,85,129,85 M161.5,73.6c1.7,8.2,1.7,9.1,1.7,10.1c0,14-15.7,21.8-36.4,21.8C80,105.5,39.1,78.1,39.1,60c0-2.8,0.6-5.4,1.5-7.3C23.8,53.5,2,56.5,2,75.7C2,107.2,76.6,146,135.7,146c45.3,0,56.7-20.5,56.7-36.6C192.3,96.6,181.4,82.2,161.5,73.6"/>
            <path fill="#000" d="M161.5,73.6c1.7,8.2,1.7,9.1,1.7,10.1c0,14-15.7,21.8-36.4,21.8C80,105.5,39.1,78.1,39.1,60c0-2.8,0.6-5.4,1.5-7.3l3.7-9.1C44,44.3,44,45,44,45.5C44,54.8,80.3,85,129,85c12.5,0,30.6-2.6,30.6-17.5c0-1.2,0-2.3-0.3-3.4L161.5,73.6z"/>
          </svg>
          <Typography variant="h6" style={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 500, fontSize: '1rem' }}>
            Red Hat Ansible Automation Platform
          </Typography>
        </Link>

        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          className={classes.search}
        >
          <div className={classes.searchIcon}>
            <SearchIcon />
          </div>
          <InputBase
            placeholder="Search..."
            classes={{
              root: classes.inputRoot,
              input: classes.inputInput,
            }}
            inputProps={{ 'aria-label': 'search' }}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
          />
        </Box>

        <div className={classes.spacer} />

        <IconButton
          edge="end"
          className={classes.iconButton}
        >
          <AccountCircle />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};
