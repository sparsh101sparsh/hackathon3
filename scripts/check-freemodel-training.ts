import { FREEMODEL_API_KEY, FREEMODEL_BASE_URL } from '../lib/freemodel';

const endpoints = [
  { name: 'models', path: '/models', method: 'GET' },
  { name: 'files', path: '/files', method: 'GET' },
  { name: 'fine_tuning_jobs', path: '/fine_tuning/jobs', method: 'GET' },
];

async function main() {
  console.log(`FreeModel base URL: ${FREEMODEL_BASE_URL}`);
  console.log(`API key configured: ${FREEMODEL_API_KEY ? 'yes' : 'no'}`);

  for (const endpoint of endpoints) {
    const response = await fetch(`${FREEMODEL_BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: FREEMODEL_API_KEY ? { Authorization: `Bearer ${FREEMODEL_API_KEY}` } : undefined,
    });
    const body = await response.text();
    console.log(`${endpoint.name}: HTTP ${response.status} ${body.slice(0, 240)}`);
  }

  console.log('Training status: FreeModel currently exposes inference discovery, but no public file-upload or fine-tuning job endpoint.');
  console.log('No model weights were changed by this check. Use the generated JSONL corpus when the provider publishes a supported training endpoint.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
