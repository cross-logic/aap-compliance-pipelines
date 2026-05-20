# Architect Review: Compliance Plugin (2026-05-20)

## Scope

Review of all changes since commit `9dd02cb` (the latest committed state). The working
tree contains 10 modified files covering:

- **scanId persistence** across remediation profiles (DB, types, service, router, frontend)
- **Rule-grouped execution view** in RemediationExecution (accordion UI, task-to-rule matching)
- **Verification scan launch** from execution completion/failure screens
- **Edit/apply mode** improvements in RemediationProfileBuilder (scanId resolution)

## Coverage Summary

| Package / Directory | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| **Overall** | 44.4% | 37.3% | 39.0% | 44.8% |
| compliance-backend/database | 97.7% | 92.6% | 96.2% | 97.5% |
| compliance-backend/router | 62.5% | 58.3% | 70.6% | 62.5% |
| compliance-backend/service/ComplianceService | 54.6% | 54.5% | 53.4% | 54.8% |
| compliance-backend/service/ControllerClient | 3.2% | 0.0% | 0.0% | 3.2% |
| compliance/ComplianceDashboard | 87.3% | 75.0% | 72.7% | 88.4% |
| compliance/ProfileBrowser | 73.4% | 43.6% | 52.4% | 73.2% |
| compliance/RemediationProfileBuilder | 60.9% | 42.4% | 49.4% | 61.1% |
| compliance/RemediationExecution | 0.0% | 0.0% | 0.0% | 0.0% |
| compliance/ScanProgress | 10.5% | 0.0% | 0.0% | 12.9% |
| compliance/ActiveJobsBanner | 0.0% | 0.0% | 0.0% | 0.0% |
| compliance/ResultsViewer | 58.6% | 54.8% | 43.3% | 58.5% |
| compliance/ScanHistory | 75.0% | 61.8% | 61.9% | 75.0% |
| compliance/ScanLauncher | 62.9% | 22.4% | 48.4% | 62.5% |
| compliance/RemediationsList | 62.0% | 66.7% | 38.9% | 63.6% |

**Test Suites:** 11 passed, 11 total
**Tests:** 191 passed, 191 total

## Issues Found and Fixed

### 1. Dead code in RemediationProfileBuilder.tsx
- **File:** `plugins/compliance/src/components/RemediationProfileBuilder/RemediationProfileBuilder.tsx`
- **Issue:** `failRatio` and `showHomogeneityAdvice` were declared (lines 331-332) but never
  used. The advice banner now uses `finding.passCount > 0 && finding.failCount > 0` directly
  in JSX, making these variables dead code.
- **Fix:** Removed both unused variable declarations.

### 2. Stale auth policy path in plugin.ts
- **File:** `plugins/compliance-backend/src/plugin.ts`
- **Issue:** `httpRouter.addAuthPolicy({ path: '/remediations' })` did not match any router
  endpoint. The actual endpoints are `/remediation-profiles` (already listed) and
  `/remediate` (also already listed). This stale path would cause 401 errors if
  Backstage auth enforcement were enabled for a path that happened to start with
  `/remediations`.
- **Fix:** Removed the stale `/remediations` auth policy entry. All actual routes
  are already covered by the remaining policies.

## Issues Reviewed and Acceptable

### Type Safety
- Zero `as any` casts in production code (verified via grep). The codebase uses
  proper type interfaces throughout.

### Error Handling
- `catch` blocks in polling effects (RemediationExecution, ScanProgress, ActiveJobsBanner)
  are intentionally silent since they represent transient network errors during polling
  that will self-correct on the next poll cycle. This is the standard Backstage pattern.
- Error catches in RemediationProfileBuilder and ComplianceDashboard use `console.error`
  which is acceptable for a prototype.

### Memory Leaks
- All `setInterval` calls in polling components have proper cleanup via `return () => clearInterval()`.
- The `ActiveJobsBanner` tick interval properly clears on both unmount and when
  `activeJobs.length` drops to 0.
- The `ScanProgress` component pauses its 1s tick timer when reaching a terminal status.
- The `RemediationExecution` polling uses `cancelled` flag pattern to prevent stale updates.

### Race Conditions
- The `knownRuleIds` dependency in RemediationExecution's polling `useEffect` is properly
  memoized via `useMemo`, preventing unnecessary polling restarts. The memoization
  depends on `selections` which only changes during the initial launch phase, not during
  active polling.
- `completeFired.current` ref correctly prevents duplicate completion callbacks.

### Unused Imports
- No unused imports found after the recent refactoring (TableHead was already removed
  in the diff).

## Mock Mode Status

### MockDataProvider Coverage
All service methods have mock paths:

| Method | Mock Path | Status |
|---|---|---|
| getProfiles() | MockDataProvider.getProfiles() | Complete |
| getInventories() | MockDataProvider.getInventories() | Complete |
| getWorkflowTemplates() | MockDataProvider.getWorkflowTemplates() | Complete |
| getExecutionEnvironments() | MockDataProvider.getExecutionEnvironments() | Complete |
| launchScan() | MockDataProvider.launchScan() | Complete |
| launchRemediation() | MockDataProvider.launchRemediation() | Complete |
| getFindings() | MockDataProvider.getFindings() | Complete |
| getWorkflowJobStatus() | Inline mock response | Complete |
| getJobStatus() | Inline mock response | Complete |
| getWorkflowNodes() | Returns [] | Complete |
| getJobEvents() | Returns [] | Complete |
| getDashboardStats() | MockDataProvider.getDashboardStats() | Complete |
| getPostureHistory() | MockDataProvider.getPostureHistory() | Complete |
| getRemediationProfiles() | MockDataProvider.getRemediationProfiles() | Complete |
| getRemediationProfile() | MockDataProvider (search by id) | Complete |
| saveRemediationProfile() | MockDataProvider.saveRemediationProfile() | Complete |
| deleteRemediationProfile() | MockDataProvider.deleteRemediationProfile() | Complete |
| buildRemediationPlan() | Pure function (no data source check) | Complete |

### Mock Findings Data Quality
Mock findings include all required fields:
- `description`, `checkText`, `fixText` -- present in all 12 mock findings
- `parameters` -- present with proper type/default/options where applicable
- `disruption` -- present (`low`, `medium`, `high` variants)
- `category` -- present in all findings

### Mock Mode Start (./bin/start.sh mock)
- `start.sh` sets `dataSource: mock` in `app-config.yaml` via sed
- Backend health endpoint returns `{ status: 'ok', dataSource: 'mock' }`
- All CRUD operations on remediation profiles work via in-memory store

## Auth Policy Completeness

All 20 router endpoints are covered by auth policies:

**Read-only (12):** health, profiles, scans, findings, cartridges, inventories,
dashboard, posture, workflow-templates, workflow-status, workflow-nodes, job-events,
job-status, controller (prefix covers 2 sub-routes)

**Mutating (3):** scan, remediate, remediation-profiles (covers GET/POST/DELETE)

## Comparison with Downstream (ansible-rhdh-plugins)

| Pattern | Downstream | This Plugin | Match |
|---|---|---|---|
| API factory via createApiFactory | Yes | Yes | Yes |
| discoveryApi + fetchApi injection | Yes | Yes | Yes |
| Bearer token via x-aap-token header | Yes | Yes | Yes |
| express-promise-router | Yes | Yes | Yes |
| Auth policy per route | Yes | Yes | Yes |
| Permission check (catalogEntityCreatePermission) | Yes | Yes (RemediationProfileBuilder) | Yes |
| Material UI (not direct PatternFly) | Yes | Yes | Yes |
| ErrorPanel boundary | Yes | Yes (ComplianceRouter) | Yes |

## Deferred Items

### 1. RemediationExecution test coverage (0%)
**Justification:** This is a complex UI component with heavy Controller API interaction
(polling, task event extraction, rule grouping). Testing requires extensive mocking of
`useParams`, `useSearchParams`, multiple sequential API calls, and timer management.
The pure functions (`extractTasksFromEvents`, `groupTasksByRule`, `computeRuleProgress`,
`computeRuleStatus`) should be extracted and unit-tested separately as a high-impact
coverage improvement.

### 2. ScanProgress test coverage (10.5%)
**Justification:** Similar to RemediationExecution -- polls Controller API for workflow
status and nodes. The `computeProgress` and `formatElapsed` utility functions should
be extracted and tested.

### 3. ActiveJobsBanner test coverage (0%)
**Justification:** Polling component with visibility-change detection. Lower priority
since it's a supplementary UI element.

### 4. ControllerClient test coverage (3.2%)
**Justification:** Requires mocking undici `fetch` and `Agent`. All Controller
interactions are integration-tested through the live lab. Unit tests for error handling
and pagination logic would be valuable but not blocking.

### 5. ExportButton test coverage (27%)
**Justification:** Uses `Blob` and `URL.createObjectURL` which require jsdom polyfills.
Functional testing covers the critical export path.

## Recommended Next Steps (Priority Order)

1. **Extract pure functions from RemediationExecution** -- `extractTasksFromEvents`,
   `groupTasksByRule`, `computeRuleProgress`, `computeRuleStatus`, `formatElapsed`,
   `computeProgress` into a shared `utils/` module and add unit tests. This would
   bring statement coverage from 44% to ~52% with minimal effort.

2. **Add ScanProgress unit tests** for `computeProgress` and `formatElapsed` (share
   with RemediationExecution after extraction).

3. **Add ControllerClient unit tests** for pagination edge cases and error handling.

4. **Clean up transient remediation profiles** -- the "Apply Remediation" flow creates
   auto-saved profiles with names like `remediation-42-1716235200000`. These accumulate
   in the database. Add a cleanup mechanism (TTL or sweep).
