import fs from 'node:fs';
import { buildVisualizerFrames, LessonFrame } from '../components/problems/ProblemVisualizer';
import { problemVisualizerScenarios, ProblemVisualizerScenario } from '../components/problems/problemVisualizerScenarios';
import { getVisualizerLesson } from '../components/problems/visualizerLessons';

interface VisualizerEntry {
  problemId: string;
  pattern: string;
  lessonPath: string;
  hasVisualizer: boolean;
}

console.log('=== DEEP DIVE AUDIT OF ALL 75 SCENARIOS ===');

const scenarioSlugs = Object.keys(problemVisualizerScenarios);
const rawConfig = fs.readFileSync('public/data/visualizers.json', 'utf8');
const jsonEntries = Object.values(JSON.parse(rawConfig)) as VisualizerEntry[];

const duplicatePhases: { slug: string; phases: readonly string[] }[] = [];
const duplicateComments: { slug: string; comments: readonly string[] }[] = [];
const runtimeExceptions: { problemId: string; slug: string; error: string }[] = [];
const codeLineOOB: { problemId: string; slug: string; codeLine: number; codeLen: number }[] = [];

for (const entry of jsonEntries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];

  if (!scenario) {
    runtimeExceptions.push({ problemId: entry.problemId, slug: profile.slug, error: 'Scenario missing' });
    continue;
  }

  // Check phase uniqueness
  if (new Set(scenario.phases).size !== scenario.phases.length) {
    duplicatePhases.push({ slug: profile.slug, phases: scenario.phases });
  }

  // Check comment uniqueness
  if (new Set(scenario.comments).size !== scenario.comments.length) {
    duplicateComments.push({ slug: profile.slug, comments: scenario.comments });
  }

  try {
    const frames = buildVisualizerFrames(entry.pattern, entry.lessonPath, entry.lessonPath);
    frames.forEach((frame, idx) => {
      if (frame.codeLine > profile.code.length || frame.codeLine < 1) {
        codeLineOOB.push({ problemId: entry.problemId, slug: profile.slug, codeLine: frame.codeLine, codeLen: profile.code.length });
      }
    });
  } catch (err: any) {
    runtimeExceptions.push({ problemId: entry.problemId, slug: profile.slug, error: String(err) });
  }
}

console.log(`Audited ${scenarioSlugs.length} scenarios across ${jsonEntries.length} problems.`);
console.log(`Duplicate phases found: ${duplicatePhases.length}`);
duplicatePhases.forEach((dp) => console.log(` - ${dp.slug}: [${dp.phases.map(p => `"${p}"`).join(', ')}]`));

console.log(`Duplicate comments found: ${duplicateComments.length}`);
duplicateComments.forEach((dc) => console.log(` - ${dc.slug}: [${dc.comments.map(c => `"${c}"`).join(', ')}]`));

console.log(`Runtime exceptions: ${runtimeExceptions.length}`);
runtimeExceptions.forEach((re) => console.log(` - ${re.problemId} (${re.slug}): ${re.error}`));

console.log(`CodeLine out of bounds: ${codeLineOOB.length}`);
codeLineOOB.forEach((cl) => console.log(` - ${cl.problemId} (${cl.slug}): line ${cl.codeLine} vs max ${cl.codeLen}`));
