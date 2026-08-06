import { formatInterviewProfile, getInterviewProfile } from '../lib/interviewProfiles';

const companies = ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'Uber'];
const profiles = companies.map(getInterviewProfile);

if (profiles.length !== companies.length || profiles.some((profile) => profile.company.length === 0)) {
  throw new Error('Every target company must resolve to a named interview profile.');
}
if (profiles.some((profile) => profile.priorities.length < 3 || profile.probes.length < 3 || profile.evaluationSignals.length < 3)) {
  throw new Error('Every interview profile must define priorities, probes, and evaluation signals.');
}
const rendered = profiles.map(formatInterviewProfile).join('\n');
if (!rendered.includes('Interview format:') || !rendered.includes('Evaluation signals:')) {
  throw new Error('Interview profiles must render into provider context.');
}

console.log(`Interview profile verification: ${profiles.length} company profiles and provider context rendering passed.`);
