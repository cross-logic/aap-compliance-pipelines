import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Compliance backend plugin — provides /api/compliance/* routes
backend.add(import('@aap-compliance/plugin-compliance-backend'));

backend.start();
