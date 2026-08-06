import { buildTutorFallbackReply } from '../lib/tutorFallback';

const context = [
  'Title: Number of Islands',
  'Reference solution template (python):',
  'def solve(grid):',
  '    pass',
  '',
  'Editorial reference:',
  'Use DFS to visit each island.',
].join('\n');

const cases = [
  ['write the code for this', 'def numIslands(grid):'],
  ['give me the whole code', 'def numIslands(grid):'],
  ['how do I optimize time complexity?', 'For **Number of Islands**'],
  ['I get a runtime error', 'compiler/runtime output'],
  ['what edge cases should I test?', 'smallest valid input'],
  ['give me a hint', 'invariant'],
] as const;

for (const [message, expected] of cases) {
  const reply = buildTutorFallbackReply({
    title: 'Number of Islands',
    language: 'python',
    userCode: '',
    userMessage: message,
    context,
  });
  if (!reply.includes(expected)) throw new Error(`Tutor fallback did not answer "${message}" as expected.`);
}

const codeReply = buildTutorFallbackReply({
  title: 'Number of Islands',
  language: 'python',
  userCode: '',
  userMessage: 'write the code',
  context,
});
if (codeReply.includes('2, 7, 11, 15') || codeReply === buildTutorFallbackReply({ title: 'Number of Islands', language: 'python', userCode: '', userMessage: 'give me a hint', context })) {
  throw new Error('Tutor fallback is still using the old generic response.');
}

console.log(`Tutor fallback verification passed: ${cases.length + 1} intent cases.`);
