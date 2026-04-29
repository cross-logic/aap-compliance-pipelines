# AAP Compliance Pipelines

A Backstage-based compliance management prototype for Ansible Automation Platform. Provides self-service compliance scanning, results analysis, and selective remediation for RHEL infrastructure.

## Prerequisites

- Node.js 20 or 22
- Corepack enabled (`corepack enable`)
- Yarn 4.x (installed via Corepack)
- Access to an AAP 2.6+ Controller instance

## Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd aap-compliance-pipelines/backstage-app

# Install dependencies and set up hooks
./install-deps

# Configure environment
cp .env.example .env
# Edit .env with your AAP connection details

# Start the dev server
yarn start
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:7007`.

## Configuration

All secrets and environment-specific values are configured via `.env`. See `.env.example` for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `AAP_HOST` | Yes | AAP Controller base URL (e.g., `https://aap.example.com`) |
| `AAP_AUTH_CLIENT_ID` | Yes | OAuth2 client ID for AAP authentication |
| `AAP_AUTH_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `AAP_API_TOKEN` | Yes | AAP API token for backend calls |
| `BACKEND_SECRET` | No | Backend auth secret (auto-generated if empty) |
| `AUTH_SIGNING_KEY` | No | JWT signing key (auto-generated if empty) |
| `GITHUB_INTEGRATION_TOKEN` | No | GitHub PAT for catalog integration |

## Repository Structure

```
aap-compliance-pipelines/
  backstage-app/                Backstage application
    packages/
      app/                      Frontend shell (React)
      backend/                  Backend server (Node.js)
    plugins/
      compliance/               Frontend plugin -- dashboard, scan, results, remediation
      compliance-backend/       Backend plugin -- scaffolder actions
      compliance-common/        Shared types and API client
    api/                        OpenAPI specification (draft)
    docs/                       Plugin and feature documentation
    examples/                   Sample catalog entities and templates
    .husky/                     Git hooks (pre-commit)
  collections/                  Ansible collections for compliance content
  content/                      Compliance content (SDP-0005/0009 pattern)
  docs/                         Design docs and research
  scripts/                      Lab seed/clean playbooks
```

## Development

### Running Tests

```bash
cd backstage-app

# Run all tests (no watch)
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:all

# Run tests for a specific plugin
yarn workspace @aap-compliance/plugin-compliance test
```

### Building

```bash
# Type-check and build all packages
yarn build

# Build all packages including optional ones
yarn build:all

# Build only the backend
yarn build:backend

# Type-check only
yarn tsc

# Full type-check (no skips)
yarn tsc:full
```

### Linting and Formatting

```bash
# Lint changed files (since origin/main)
yarn lint

# Lint all files
yarn lint:all

# Auto-fix lint issues
yarn fix

# Check formatting
yarn prettier:check
```

### Pre-commit Hooks

Husky runs `lint-staged` on every commit, which applies ESLint and Prettier to staged `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, and `.cjs` files.

## Troubleshooting

### `yarn start` fails with module errors

Make sure you are using Node.js 20 or 22. Run `node --version` to check.

### AAP connection errors

Verify your `.env` values. The `AAP_HOST` must be reachable from your machine. If using a self-signed certificate, ensure `checkSSL: false` is set in `app-config.yaml`.

### `corepack` not found

Corepack ships with Node.js 16.10+. Run `corepack enable` to activate it. If using `nvm`, you may need to run this after switching Node versions.

### Tests fail with experimental VM modules warning

This is expected -- the `--experimental-vm-modules` flag is set automatically via the `test` script. If you see warnings (not errors), they are safe to ignore.

### Pre-commit hook not running

Run `yarn prepare` to reinstall Husky hooks, or run `./install-deps` to set up the full development environment.
