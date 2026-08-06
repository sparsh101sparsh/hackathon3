import fs from 'node:fs';
import { buildVisualizerFrames } from '../components/problems/ProblemVisualizer';
import { getVisualizerLesson } from '../components/problems/visualizerLessons';
import { problemVisualizerScenarios } from '../components/problems/problemVisualizerScenarios';

type Entry = { problemId: string; pattern: string; lessonPath: string; hasVisualizer: boolean };
const entries = Object.values(JSON.parse(fs.readFileSync('public/data/visualizers.json', 'utf8'))) as Entry[];

console.log(`=======================================================`);
console.log(`DEEP ADVERSARIAL STRESS TEST (75 PROBLEMS x 4 FRAMES)`);
console.log(`=======================================================\n`);

let duplicateLabelCount = 0;
let overlappingPointersCount = 0;
let longNodeLabelsCount = 0;
let longStateValueCount = 0;
let codeLineMismatchCount = 0;

for (const entry of entries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];
  if (!scenario) continue;

  const frames = buildVisualizerFrames(entry.pattern, entry.lessonPath, entry.lessonPath);

  frames.forEach((frame, stepIndex) => {
    // 1. Check duplicate state labels (React key collision risk)
    const labels = frame.state.map((s) => s.label);
    const uniqueLabels = new Set(labels);
    if (labels.length !== uniqueLabels.size) {
      duplicateLabelCount++;
      console.log(`⚠️ [DUPLICATE_STATE_KEY] ${entry.problemId} Step ${stepIndex}: duplicate labels in [${labels.join(', ')}]`);
    }

    // 2. Check overlapping pointers in ArrayScene
    if (frame.visualType === 'array' && frame.pointers) {
      const pointerIndices = Object.entries(frame.pointers);
      const indexToNames: Record<number, string[]> = {};
      for (const [name, idx] of pointerIndices) {
        if (!indexToNames[idx]) indexToNames[idx] = [];
        indexToNames[idx].push(name);
      }
      for (const [idx, names] of Object.entries(indexToNames)) {
        if (names.length > 1) {
          overlappingPointersCount++;
          console.log(`ℹ️ [OVERLAPPING_POINTERS] ${entry.problemId} Step ${stepIndex}: pointers [${names.join(', ')}] at index ${idx}`);
        }
      }
    }

    // 3. Check long node labels in NodeScene
    if (frame.visualType === 'nodes' && frame.nodes) {
      for (const node of frame.nodes) {
        if (node.length > 8) {
          longNodeLabelsCount++;
          console.log(`ℹ️ [LONG_NODE_LABEL] ${entry.problemId} Step ${stepIndex}: node label "${node}" length ${node.length}`);
        }
      }
    }

    // 4. Check long state values (potential flex/grid overflow or line wrap)
    for (const item of frame.state) {
      if (item.value.length > 40) {
        longStateValueCount++;
        console.log(`ℹ️ [LONG_STATE_VALUE] ${entry.problemId} Step ${stepIndex} (${item.label}): "${item.value}" length ${item.value.length}`);
      }
    }

    // 5. Check code line range
    if (frame.codeLine < 1 || frame.codeLine > profile.code.length) {
      codeLineMismatchCount++;
      console.log(`⚠️ [CODE_LINE_MISMATCH] ${entry.problemId} Step ${stepIndex}: codeLine ${frame.codeLine} vs code length ${profile.code.length}`);
    }
  });
}

console.log('\n--- DEEP STRESS TEST SUMMARY ---');
console.log(`Duplicate State Key Collisions: ${duplicateLabelCount}`);
console.log(`Overlapping Pointer Scenarios: ${overlappingPointersCount}`);
console.log(`Long Node Labels (>8 chars): ${longNodeLabelsCount}`);
console.log(`Long State Values (>40 chars): ${longStateValueCount}`);
console.log(`Code Line Mismatches: ${codeLineMismatchCount}`);
