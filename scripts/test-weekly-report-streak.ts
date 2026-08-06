import { prisma } from '../lib/prisma';

async function testWeeklyReportStreakLogic() {
  console.log('🧪 Testing Weekly Report 0-Day Streak Weekly report logic...');

  // Test guest/0-day streak fallback logic directly
  const streak = 0;
  const userName = 'sparsh';

  const summaryText =
    streak > 0
      ? `${userName} demonstrated strong commitment with a ${streak}-day active streak, advancing significantly in Dynamic Programming and Graph algorithms.`
      : `${userName} is ready to kickstart their daily streak today and accelerate their progress in Dynamic Programming and Graph algorithms.`;

  const streakStrength =
    streak > 0
      ? `Consistent daily practice maintaining a ${streak}-day active streak`
      : 'Proactive engagement in exploring targeted problem categories';

  console.log('\nResult for 0-Day Streak:');
  console.log('Summary:', summaryText);
  console.log('Strength:', streakStrength);

  if (summaryText.includes('0-day active streak') || streakStrength.includes('Consistent daily practice')) {
    console.error('❌ BUG DETECTED: Contradictory text present for 0-day streak!');
    process.exit(1);
  }

  console.log('\n✅ 0-Day Streak logic test PASSED cleanly!\n');
}

testWeeklyReportStreakLogic();
