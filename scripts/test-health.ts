import { GET as healthHandler } from '../app/api/health/route';
import '../lib/prisma';

async function run() {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalJwtSecret = process.env.JWT_SECRET;

  delete process.env.DATABASE_URL;
  delete process.env.JWT_SECRET;
  const notReadyResponse = await healthHandler();
  const notReadyBody = await notReadyResponse.json();
  if (notReadyResponse.status !== 503 || notReadyBody.status !== 'not_ready') {
    throw new Error(`Health check should report missing configuration as not ready: HTTP ${notReadyResponse.status}`);
  }

  if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalJwtSecret) process.env.JWT_SECRET = originalJwtSecret;

  const response = await healthHandler();
  const body = await response.json();

  if (response.status !== 200 || body.status !== 'ok' || body.checks?.database !== 'ok') {
    throw new Error(`Health check failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }

  if (response.headers.get('cache-control') !== 'no-store, max-age=0') {
    throw new Error('Health check must disable caching');
  }

  console.log('Health endpoint verification: database probe and no-store response passed.');
}

run().catch((error) => {
  console.error('Health endpoint verification failed:', error);
  process.exit(1);
});
