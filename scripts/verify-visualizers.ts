import fs from 'node:fs';
import { buildVisualizerFrames } from '../components/problems/ProblemVisualizer';
import { getVisualizerLesson, hasCustomVisualizerLesson } from '../components/problems/visualizerLessons';
import { problemVisualizerScenarios } from '../components/problems/problemVisualizerScenarios';

type Entry = { problemId: string; pattern: string; lessonPath: string; hasVisualizer: boolean };
const entries = Object.values(JSON.parse(fs.readFileSync('public/data/visualizers.json', 'utf8'))) as Entry[];
const failures: string[] = [];

function hasValidVisualPayload(frame: ReturnType<typeof buildVisualizerFrames>[number]) {
  const active = frame.active || [];
  if (active.some((index) => !Number.isInteger(index) || index < 0)) return false;

  if (frame.visualType === 'array') {
    if (!Array.isArray(frame.values) || frame.values.length === 0) return false;
    if (active.some((index) => index >= frame.values!.length)) return false;
    return Object.values(frame.pointers || {}).every((index) => Number.isInteger(index) && index >= 0 && index < frame.values!.length);
  }
  if (frame.visualType === 'matrix') {
    if (!Array.isArray(frame.matrix) || frame.matrix.length === 0 || !Array.isArray(frame.matrix[0])) return false;
    const cols = Math.max(...frame.matrix.map((row) => row.length), 0);
    const cellCount = frame.matrix.reduce((sum, row) => sum + row.length, 0);
    return cols > 0 && active.every((index) => index < cellCount);
  }
  if (frame.visualType === 'stack') return Array.isArray(frame.stack);
  if (frame.visualType === 'nodes') return Array.isArray(frame.nodes) && frame.nodes.length > 0 && active.every((index) => index < frame.nodes!.length);
  if (frame.visualType === 'graph') {
    return Array.isArray(frame.nodes) &&
      frame.nodes.length > 0 &&
      Array.isArray(frame.edges) &&
      active.every((index) => index < frame.nodes!.length) &&
      frame.edges.every(([from, to]) => from >= 0 && to >= 0 && from < frame.nodes!.length && to < frame.nodes!.length);
  }
  if (frame.visualType === 'bars') return Array.isArray(frame.bars) && frame.bars.length > 0 && active.every((index) => index < frame.bars!.length);
  if (frame.visualType === 'bits') return typeof frame.bits === 'string' && frame.bits.length > 0;
  return false;
}

for (const entry of entries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const frames = buildVisualizerFrames(entry.pattern, entry.lessonPath, entry.lessonPath);
  const hasState = frames[0]?.state.some((item) => item.label === 'input') && frames.at(-1)?.state.some((item) => item.label === 'output');
  const hasValidCodeLines = frames.every((item) => item.codeLine >= 1 && item.codeLine <= profile.code.length);
  const scenario = problemVisualizerScenarios[profile.slug];
  const hasProblemSpecificScenario = Boolean(
    scenario &&
    scenario.visualType &&
    scenario.phases.length >= 4 &&
    new Set(scenario.phases).size === scenario.phases.length &&
    scenario.comments.length >= 4 &&
    new Set(scenario.comments).size === scenario.comments.length &&
    scenario.comments.every((comment) => comment.length >= 24),
  );
  const hasDistinctFrameContent = frames.length >= 8 && frames.length <= 12 && new Set(frames.map((item) => item.commentary)).size === frames.length && frames.every((item) => item.state.some((state) => state.label === 'phase') && item.state.some((state) => state.label === 'focus'));
  const hasUsefulState = frames.every((item) => item.state.length >= 5 && item.state.some((state) => state.label === 'step'));
  const hasValidPayloads = frames.every(hasValidVisualPayload);
  const avoidsShallowTransitionText = frames.every((item) => !/check the visible state|confirm the visible state/i.test(item.commentary));
  if (!entry.problemId || !entry.lessonPath || !entry.hasVisualizer || !hasCustomVisualizerLesson(entry.lessonPath) || !hasProblemSpecificScenario || !hasDistinctFrameContent || !hasUsefulState || !hasValidPayloads || !avoidsShallowTransitionText || frames.length < 8 || frames.length > 12 || !profile.focus || !profile.input || !profile.output || profile.code.length < 5 || !hasState || !hasValidCodeLines) {
    failures.push(`${entry.problemId || 'unknown'} (${entry.pattern})`);
  }
}

const patterns = [...new Set(entries.map((entry) => entry.pattern))];
console.log(`visualizers: ${entries.length}`);
console.log(`patterns: ${patterns.length} (${patterns.join(', ')})`);
console.log(`frames: ${entries.length ? 'every mapped lesson has 8-12 distinct steps, input/output state, and valid highlighted code' : 'none'}`);
console.log(`recipes: ${entries.length ? 'every mapped lesson has a problem-specific scenario and visual type' : 'none'}`);

if (entries.length !== 75 || failures.length) {
  console.error(`verification failed: ${failures.join(', ') || `expected 75 entries, found ${entries.length}`}`);
  process.exit(1);
}

console.log('verification passed');
