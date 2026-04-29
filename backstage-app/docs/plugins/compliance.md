# Compliance Plugin

The `@aap-compliance/plugin-compliance` package is a Backstage frontend plugin that provides compliance management capabilities.

## Plugin Registration

The plugin is registered in `src/plugin.ts` using `createPlugin` and exposes a single routable extension (`CompliancePage`) mounted at the `compliance` route.

```typescript
import { CompliancePage } from '@aap-compliance/plugin-compliance';

// In App.tsx
<Route path="/compliance" element={<CompliancePage />} />
```

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ComplianceDashboard` | `/compliance` | Posture gauges, key metrics, quick actions, recent scans, framework cards |
| `ProfileBrowser` | `/compliance/profiles/:profileId` | List and detail view for compliance profiles |
| `ScanLauncher` | `/compliance/scan` | Three-step wizard to configure and launch a scan |
| `ResultsViewer` | `/compliance/results/:jobId` | Multi-host findings table with filters and expandable detail |
| `RemediationProfileBuilder` | `/compliance/remediation/:jobId` | Toggle rules, set scope, configure parameters |
| `RemediationExecution` | `/compliance/execute/:jobId` | Progress tracking and before/after comparison |

## Routing

The `ComplianceRouter` component manages tab navigation and nested routes. Tabs map to:

- **Overview** -- `ComplianceDashboard`
- **Profiles** -- `ProfileBrowser`
- **New Scan** -- `ScanLauncher`
- **Results** -- `ResultsViewer` (also covers remediation views)

## Shared Types

Types are defined in `@aap-compliance/common` (`plugins/compliance-common/`):

- `Finding`, `FindingSeverity`, `FindingStatus` -- scan result types
- `ComplianceProfile`, `RemediationProfile` -- profile types
- `ComplianceApiClient` -- API client for AAP integration

## Configuration

The plugin reads AAP connection details from `app-config.yaml`:

```yaml
ansible:
  rhaap:
    baseUrl: ${AAP_HOST}
    checkSSL: false
    token: ${AAP_API_TOKEN}
```

Set these values in your `.env` file (see `.env.example`).

## Testing

```bash
yarn test                    # Run all tests
yarn test:watch              # Watch mode
yarn workspace @aap-compliance/plugin-compliance test  # Plugin tests only
```
