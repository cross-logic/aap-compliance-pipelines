# AAP Compliance Pipelines Prototype

Self-contained prototype for an AAP compliance vertical — Backstage plugin + RHEL STIG content.

## Structure

- `backstage-app/` — Backstage application with compliance plugins
  - `plugins/compliance/` — Frontend plugin (7 views: overview, profiles, scan, results, remediations, settings)
  - `plugins/compliance-backend/` — Backend plugin (REST API, Controller client, DB)
  - `plugins/compliance-common/` — Shared types
- `content/` — Compliance content packaged as Ansible Pattern (SDP-0005/0009)
- `scripts/` — Lab seed/clean playbooks
- `docs/` — Design docs and research

## Lab Connection

AAP 2.6 lab at `192.168.128.128`. Compliance resources isolated in `compliance-prototype` organization.
All AAP resources prefixed `compliance-*`.

## Development

```bash
cd backstage-app
yarn install
./bin/start.sh live   # Connect to lab AAP (needs VM running + aap-lab start)
./bin/start.sh mock   # Demo mode with hardcoded data
./bin/stop.sh         # Stop frontend + backend
yarn test             # Run 190 tests across 11 suites
yarn build            # Build all packages
```

## Terminology

- "Compliance profile" = registered standard mapped to workflow + EE (Settings tab)
- "Remediation" = saved rule selections + parameter overrides (Remediations tab)
- "Cartridge" = internal code only (types, DB tables, API routes) — never in UI
- AAP 2.6 terms: "automation controller" (lowercase), "workflow job template", "platform gateway"

## Engineering Standards

- Material UI themed to PatternFly 6 (Backstage exemption from direct PatternFly)
- All API calls through platform gateway (`/api/controller/v2/`)
- Per-user AAP tokens via `x-aap-token` header
- RHDH dynamic plugin packaging
- Match Ansible Portal look and feel (ansible-backstage-plugins reference)
- 190 tests across 11 suites (frontend + backend + database)
