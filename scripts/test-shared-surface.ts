import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'components/navbar/Navbar.tsx',
  'components/footer/Footer.tsx',
  'app/dashboard/page.tsx',
  'components/dashboard/TeachingStyleSelector.tsx',
  'components/dashboard/WeeklyInsights.tsx',
  'app/problems/page.tsx',
  'app/problems/[id]/page.tsx',
  'app/login/page.tsx',
  'app/register/page.tsx',
  'app/mock-interview/page.tsx',
  'components/editor/EditorWorkspace.tsx',
  'components/guidance/ProgressiveHints.tsx',
  'components/guidance/TutorDrawer.tsx',
  'components/landing/HeroSection.tsx',
  'components/landing/CoreFeaturesGrid.tsx',
  'app/leaderboard/page.tsx',
  'components/dashboard/BadgesGrid.tsx',
  'components/dashboard/RatingHistoryChart.tsx',
  'app/page.tsx',
  'components/landing/FaqAndTestimonials.tsx',
  'components/landing/MonacoPreviewDemo.tsx',
  'components/problems/VisualizerTutor.tsx',
  'components/guidance/RecommendationsWidget.tsx',
  'components/guidance/CodeReviewModal.tsx',
  'components/contests/JudgeScorecardModal.tsx',
  'components/contests/OnDemandContestModal.tsx',
  'components/contests/CreateRoomModal.tsx',
  'components/contests/JoinRoomModal.tsx',
  'components/contests/LiveCommentator.tsx',
  'app/contests/room/[code]/page.tsx',
  'app/company/system-design/page.tsx',
  'app/admin/page.tsx',
  'app/admin/problems/new/page.tsx',
  'app/admin/problems/[id]/edit/page.tsx',
];

const forbidden = [
  /bg-gradient-to-(r|br|tr)/,
  /from-(cyan|purple|indigo)-/,
  /(?:text|bg)-(cyan|purple|indigo)-/,
];

const failures: string[] = [];
for (const relative of files) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${relative}: ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Shared surface contract: ${files.length} files passed.`);
