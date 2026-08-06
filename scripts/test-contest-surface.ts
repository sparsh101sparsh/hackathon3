import fs from 'node:fs';

const contests = fs.readFileSync('app/contests/page.tsx', 'utf8');

if (!contests.includes('Swords') || !contests.includes('Create Private Room') || !contests.includes('Join Room')) {
  throw new Error('Contest surface must expose semantic battle, create-room, and join-room controls.');
}
if (contests.includes('bg-gradient-to-r')) {
  throw new Error('Contest surface must not use the old promotional gradient buttons.');
}
if (!contests.includes('bg-amber-400')) {
  throw new Error('Contest surface must retain the amber engineering accent.');
}

console.log('Contest surface verification: battle controls and restrained visual language are preserved.');
