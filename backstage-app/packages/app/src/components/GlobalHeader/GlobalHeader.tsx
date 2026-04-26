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
        <Typography variant="h6" className={classes.title}>
          <Link to="/" className={classes.title}>
            Ansible Automation Platform
          </Link>
        </Typography>

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
