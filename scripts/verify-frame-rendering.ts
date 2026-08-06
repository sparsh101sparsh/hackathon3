import fs from 'node:fs';
import { buildVisualizerFrames, LessonFrame } from '../components/problems/ProblemVisualizer';
import { problemVisualizerScenarios } from '../components/problems/problemVisualizerScenarios';
import { getVisualizerLesson } from '../components/problems/visualizerLessons';

interface VisualizerEntry {
  problemId: string;
  pattern: string;
  lessonPath: string;
  hasVisualizer: boolean;
}

const runtimeErrors: string[] = [];
const schemaErrors: string[] = [];
const qualityWarnings: string[] = [];

console.log('================================================================');

function validateIndexes(entry: VisualizerEntry, frame: LessonFrame, stepIdx: number) {
  const active = frame.active || [];
  if (active.some((index) => !Number.isInteger(index) || index < 0)) {
    schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Active index must be a non-negative integer.`);
  }

  switch (frame.visualType) {
    case 'array':
      if (!Array.isArray(frame.values)) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Array frame missing values.`);
        return;
      }
      if (active.some((index) => index >= frame.values!.length)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Array active index out of bounds.`);
      if (!Object.values(frame.pointers || {}).every((index) => Number.isInteger(index) && index >= 0 && index < frame.values!.length)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Array pointer out of bounds.`);
      return;
    case 'matrix': {
      if (!Array.isArray(frame.matrix)) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Matrix frame missing matrix.`);
        return;
      }
      const cellCount = frame.matrix.reduce((sum, row) => sum + row.length, 0);
      if (cellCount === 0 || active.some((index) => index >= cellCount)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Matrix active index out of bounds.`);
      return;
    }
    case 'stack':
      if (!Array.isArray(frame.stack)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Stack frame missing stack.`);
      return;
    case 'nodes':
      if (!Array.isArray(frame.nodes)) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Nodes frame missing nodes.`);
        return;
      }
      if (active.some((index) => index >= frame.nodes!.length)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Node active index out of bounds.`);
      return;
    case 'graph':
      if (!Array.isArray(frame.nodes) || !Array.isArray(frame.edges)) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Graph frame missing nodes/edges.`);
        return;
      }
      if (active.some((index) => index >= frame.nodes!.length)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Graph active index out of bounds.`);
      if (frame.edges.some(([from, to]) => from < 0 || to < 0 || from >= frame.nodes!.length || to >= frame.nodes!.length)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Graph edge out of bounds.`);
      return;
    case 'bars':
      if (!Array.isArray(frame.bars)) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Bars frame missing bars.`);
        return;
      }
      if (frame.bars.length > 12) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Bars frame exceeds the renderer limit.`);
      if (!frame.bars.every((value) => Number.isFinite(value))) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Bars must be finite values.`);
      if (active.some((index) => index >= frame.bars!.length)) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Bars active index out of bounds.`);
      return;
    case 'bits':
      if (typeof frame.bits !== 'string' || frame.bits.length === 0) schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Bits frame missing bits.`);
      return;
  }
}
console.log(' INDEPENDENT VERIFICATION SCRIPT: FRAME RENDERING DATA GENERATION');
console.log('================================================================');

// 1. Load data
const scenarioSlugs = Object.keys(problemVisualizerScenarios);
const rawConfig = fs.readFileSync('public/data/visualizers.json', 'utf8');
const jsonEntries = Object.values(JSON.parse(rawConfig)) as VisualizerEntry[];

console.log(`\n[1/3] Inventory Verification:`);
console.log(` - problemVisualizerScenarios.ts contains ${scenarioSlugs.length} problem scenarios.`);
console.log(` - public/data/visualizers.json contains ${jsonEntries.length} mapped visualizer entries.`);

if (scenarioSlugs.length !== 75 || jsonEntries.length !== 75) {
  schemaErrors.push(`Expected exactly 75 scenarios and 75 mapped visualizers.`);
}

// 2. Test runtime frame rendering execution for all 75 problems
console.log(`\n[2/3] Runtime Frame Rendering Execution Test:`);

let totalFramesCount = 0;

for (const entry of jsonEntries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];

  if (!scenario) {
    runtimeErrors.push(`Problem ${entry.problemId} (${profile.slug}): Missing scenario in problemVisualizerScenarios.`);
    continue;
  }

  // Check phase & comment quality
  if (new Set(scenario.phases).size !== scenario.phases.length) {
    qualityWarnings.push(`Problem ${entry.problemId} (${profile.slug}): Non-unique phases [${scenario.phases.join(', ')}]`);
  }
  if (new Set(scenario.comments).size !== scenario.comments.length) {
    qualityWarnings.push(`Problem ${entry.problemId} (${profile.slug}): Non-unique comments`);
  }

  try {
    // Invoke buildVisualizerFrames, which invokes buildScenarioFrames internally
    const frames = buildVisualizerFrames(entry.pattern, entry.lessonPath, entry.lessonPath);
    totalFramesCount += frames.length;

    if (profile.slug === 'longest-increasing-subsequence') {
      const firstBars = frames.find((frame) => frame.visualType === 'bars')?.bars || [];
      if (firstBars.join(',') !== '10,9,2,5,3,7,101,18') {
        schemaErrors.push(`Problem ${entry.problemId} (${profile.slug}): Bars must match the LIS lesson input, found [${firstBars.join(',')}].`);
      }
    }

    if (profile.slug === 'sliding-window-maximum') {
      const firstBars = frames.find((frame) => frame.visualType === 'bars')?.bars || [];
      if (firstBars.join(',') !== '1,3,-1,-3,5,3,6,7') {
        schemaErrors.push(`Problem ${entry.problemId} (${profile.slug}): Bars must preserve the negative lesson input, found [${firstBars.join(',')}].`);
      }
    }

    if (profile.slug === 'trapping-rain-water') {
      const firstBars = frames.find((frame) => frame.visualType === 'bars')?.bars || [];
      if (!firstBars.includes(0)) {
        schemaErrors.push(`Problem ${entry.problemId} (${profile.slug}): Bars must preserve zero-height walls.`);
      }
    }

    if (frames.length < 8 || frames.length > 12) {
      schemaErrors.push(`Problem ${entry.problemId} (${profile.slug}): Expected 8-12 frames, produced ${frames.length}.`);
    }
    if (new Set(frames.map((item) => item.commentary)).size !== frames.length) {
      schemaErrors.push(`Problem ${entry.problemId} (${profile.slug}): Frame commentary is not unique.`);
    }

    frames.forEach((frame: LessonFrame, stepIdx: number) => {
      if (!frame.visualType) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Missing visualType.`);
      }
      if (typeof frame.codeLine !== 'number' || frame.codeLine < 1 || frame.codeLine > profile.code.length) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Invalid codeLine ${frame.codeLine} (code len: ${profile.code.length}).`);
      }
      if (!frame.commentary || typeof frame.commentary !== 'string') {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Missing or invalid commentary.`);
      }
      if (/check the visible state|confirm the visible state/i.test(frame.commentary)) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Shallow transition commentary detected.`);
      }
      if (!Array.isArray(frame.state) || frame.state.length < 5 || !frame.state.some((item) => item.label === 'phase') || !frame.state.some((item) => item.label === 'step')) {
        schemaErrors.push(`Problem ${entry.problemId} step ${stepIdx}: Frame needs phase, step, and useful state chips.`);
      }

      // Check frame payload for visualType
      validateIndexes(entry, frame, stepIdx);
    });

  } catch (err: any) {
    runtimeErrors.push(`Problem ${entry.problemId} (${profile.slug}): THREW RUNTIME EXCEPTION: ${err.message || err}`);
  }
}

console.log(` - Generated and validated ${totalFramesCount} frames across 75 problems.`);
console.log(` - Runtime exceptions caught: ${runtimeErrors.length}`);
console.log(` - Schema / Data structure errors: ${schemaErrors.length}`);
console.log(` - Quality warnings (e.g. duplicate phase names): ${qualityWarnings.length}`);

if (qualityWarnings.length > 0) {
  console.log('\nQuality Warnings:');
  qualityWarnings.forEach((w) => console.log(` [WARN] ${w}`));
}

// 3. Final verdict
console.log('\n[3/3] Final Verdict:');
if (runtimeErrors.length > 0 || schemaErrors.length > 0) {
  console.error('VERIFICATION FAILED!');
  runtimeErrors.forEach((e) => console.error(` [RUNTIME ERROR] ${e}`));
  schemaErrors.forEach((e) => console.error(` [SCHEMA ERROR] ${e}`));
  process.exit(1);
} else {
  console.log('SUCCESS: All 75 problem scenarios execute frame rendering without throwing runtime errors!');
}
