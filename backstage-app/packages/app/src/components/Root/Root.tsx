import { PropsWithChildren } from 'react';
import { makeStyles } from '@material-ui/core';
import {
  Sidebar,
  sidebarConfig,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarScrollWrapper,
  SidebarSpace,
  useSidebarOpenState,
  Link,
} from '@backstage/core-components';
import MenuIcon from '@material-ui/icons/Menu';
import SecurityIcon from '@material-ui/icons/Security';
import HistoryIcon from '@material-ui/icons/History';
import SettingsIcon from '@material-ui/icons/Settings';

const useStyles = makeStyles({
  sidebarLogoRoot: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  sidebarLogoLink: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontFamily: '"Red Hat Display", "Red Hat Text", sans-serif',
    fontSize: '0.7rem',
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: 'nowrap' as const,
  },
});

const RedHatLogo = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 192.3 146" width={size} height={size * 0.76} xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#e00"
      d="M129,85c12.5,0,30.6-2.6,30.6-17.5c0-1.2,0-2.3-0.3-3.4l-7.4-32.4c-1.7-7.1-3.2-10.3-15.7-16.6C126.4,10.2,105.3,2,99,2c-5.8,0-7.5,7.5-14.4,7.5c-6.7,0-11.6-5.6-17.9-5.6c-6,0-9.9,4.1-12.9,12.5c0,0-8.4,23.7-9.5,27.2C44,44.3,44,45,44,45.5C44,54.8,80.3,85,129,85 M161.5,73.6c1.7,8.2,1.7,9.1,1.7,10.1c0,14-15.7,21.8-36.4,21.8C80,105.5,39.1,78.1,39.1,60c0-2.8,0.6-5.4,1.5-7.3C23.8,53.5,2,56.5,2,75.7C2,107.2,76.6,146,135.7,146c45.3,0,56.7-20.5,56.7-36.6C192.3,96.6,181.4,82.2,161.5,73.6"
    />
  </svg>
);

const SidebarLogo = () => {
  const classes = useStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.sidebarLogoRoot}>
      <Link to="/" underline="none" className={classes.sidebarLogoLink} aria-label="Home">
        <div className={classes.logoContainer}>
          <RedHatLogo size={isOpen ? 28 : 22} />
          {isOpen && (
            <div className={classes.logoText}>
              Ansible<br />Automation<br />Platform
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem icon={SecurityIcon} to="/compliance" text="Templates" />
        <SidebarItem icon={HistoryIcon} to="/compliance/results/42" text="History" />
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup label="Settings" icon={<SettingsIcon />} to="/settings">
        <SidebarItem icon={SettingsIcon} to="/settings" text="Administration" />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);
