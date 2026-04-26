# AAP Compliance Pipelines Prototype

Self-contained prototype for an AAP compliance vertical — Backstage plugin + RHEL STIG content.

## Structure

- `backstage-app/` — Backstage application with compliance plugins
  - `plugins/compliance/` — Frontend plugin (dashboard, scan, results, remediation profile builder)
  - `plugins/compliance-backend/` — Backend plugin (scaffolder actions)
  - `plugins/compliance-common/` — Shared types and API client
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
yarn start        # Dev server at localhost:3000
yarn test         # Run tests
yarn build        # Build all packages
```

## Engineering Standards

- Material UI themed to PatternFly 6 (Backstage exemption from direct PatternFly)
- OAuth2 + PKCE auth with AAP Gateway
- RHDH dynamic plugin packaging
- Match Ansible Portal look and feel (ansible-backstage-plugins reference)
