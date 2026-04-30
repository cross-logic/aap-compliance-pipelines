import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Required infrastructure plugins
backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// Compliance backend plugin — provides /api/compliance/* routes
backend.add(import('@aap-compliance/plugin-compliance-backend'));

backend.start();
