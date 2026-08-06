import { seedDatabase } from '../scripts/seed-problems';

async function main() {
  await seedDatabase();
}

main().catch((err) => {
  console.error('❌ Error during prisma seed:', err);
  process.exit(1);
});
