import fs from 'node:fs';
import path from 'node:path';
import { FREEMODEL_API_KEY } from '../lib/freemodel';

const corpusPath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
const uploadUrl = process.env.FREEMODEL_TRAINING_UPLOAD_URL;
const jobUrl = process.env.FREEMODEL_TRAINING_JOB_URL;

async function main() {
  if (!uploadUrl || !jobUrl) {
    throw new Error(
      'Provider training is not configured. Set FREEMODEL_TRAINING_UPLOAD_URL and FREEMODEL_TRAINING_JOB_URL only when FreeModel provides a compatible training API.',
    );
  }
  if (!FREEMODEL_API_KEY) throw new Error('FREEMODEL_API_KEY is not configured');
  if (!fs.existsSync(corpusPath)) throw new Error(`Training corpus not found: ${corpusPath}`);

  const corpusCount = fs.readFileSync(corpusPath, 'utf8').trim().split('\n').filter(Boolean).length;

  const file = new Blob([fs.readFileSync(corpusPath)], { type: 'application/jsonl' });
  const form = new FormData();
  form.append('file', file, 'freemodel-question-corpus.jsonl');
  form.append('purpose', 'fine-tune');

  const headers = { Authorization: `Bearer ${FREEMODEL_API_KEY}` };
  const uploadResponse = await fetch(uploadUrl, { method: 'POST', headers, body: form });
  const uploadBody = await uploadResponse.text();
  if (!uploadResponse.ok) throw new Error(`Training file upload failed (${uploadResponse.status}): ${uploadBody.slice(0, 500)}`);

  const uploaded = JSON.parse(uploadBody) as { id?: string };
  if (!uploaded.id) throw new Error('Training upload response did not contain a file id');

  const jobResponse = await fetch(jobUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ training_file: uploaded.id }),
  });
  const jobBody = await jobResponse.text();
  if (!jobResponse.ok) throw new Error(`Fine-tuning job creation failed (${jobResponse.status}): ${jobBody.slice(0, 500)}`);
  console.log(`Fine-tuning job submitted for ${corpusCount} canonical questions: ${jobBody}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
