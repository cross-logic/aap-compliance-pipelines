# Compliance Dashboard

The compliance dashboard provides an at-a-glance view of your organization's compliance posture across multiple frameworks.

## Layout

The dashboard is divided into four sections:

### 1. Compliance Gauges

Circular gauges showing overall compliance percentage and per-framework scores (DISA STIG, CIS L1, PCI-DSS). Color-coded:
- Green (80%+): compliant
- Yellow (65-79%): needs attention
- Red (<65%): critical

### 2. Key Metrics

Four stat cards showing:
- **Hosts Scanned** -- total hosts across all inventories
- **Critical (CAT I)** -- count of CAT I severity findings (red)
- **Pending Remediation** -- rules awaiting remediation (yellow)
- **Active Profiles** -- registered compliance profiles (green)

### 3. Quick Actions and Recent Scans

Side-by-side layout:
- **Quick Actions** -- clickable cards to launch a new scan or browse profiles
- **Recent Scans** -- list of recent scan results with profile name, target, pass rate, and age

### 4. Active Compliance Profiles

Cards for each active framework showing target OS, rule count, compliance percentage bar, and last scan time.

## Navigation

- Clicking "New Scan" navigates to the Scan Launcher (`/compliance/scan`)
- Clicking "Browse Profiles" navigates to the Profile Browser (`/compliance/profiles/all`)
- Recent scan entries can be clicked to view full results

## Data Source

Currently uses mock data defined inline. In production, data will be fetched from the compliance backend API via `ComplianceApiClient`.

## Configuration

No additional configuration beyond the base AAP connection is required for the dashboard.
