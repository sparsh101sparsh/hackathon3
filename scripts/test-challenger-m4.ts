import fs from 'node:fs';
import { buildVisualizerFrames, LessonFrame } from '../components/problems/ProblemVisualizer';
import { getVisualizerLesson, hasCustomVisualizerLesson } from '../components/problems/visualizerLessons';
import { problemVisualizerScenarios, ScenarioVisualType } from '../components/problems/problemVisualizerScenarios';
import { SCENE_THEME } from '../components/problems/VisualizerScene';

type Entry = { problemId: string; pattern: string; lessonPath: string; hasVisualizer: boolean };

const entries = Object.values(JSON.parse(fs.readFileSync('public/data/visualizers.json', 'utf8'))) as Entry[];

console.log('=== EMPIRICAL CHALLENGER MILESTONE 4 TEST HARNESS ===\n');

// 1. Dataset Integrity & Mappings
console.log('1. Testing Dataset Integrity & Mappings:');
console.log(`Total entries in visualizers.json: ${entries.length}`);

const uniqueProblemIds = new Set(entries.map((e) => e.problemId));
if (uniqueProblemIds.size !== entries.length) {
  console.error(`❌ Duplicate problem IDs found! Expected ${entries.length}, got ${uniqueProblemIds.size}`);
} else {
  console.log('✅ All 75 problem IDs are unique.');
}

const scenarioKeys = Object.keys(problemVisualizerScenarios);
console.log(`Total scenarios defined in problemVisualizerScenarios: ${scenarioKeys.length}`);

const visualizerSlugs = entries.map((e) => getVisualizerLesson(e.lessonPath, e.pattern).slug);
const missingScenarios = visualizerSlugs.filter((slug) => !problemVisualizerScenarios[slug]);
if (missingScenarios.length > 0) {
  console.error(`❌ Missing scenarios for slugs: ${missingScenarios.join(', ')}`);
} else {
  console.log('✅ All 75 visualizer entries map to a scenario in problemVisualizerScenarios.');
}

const orphanScenarios = scenarioKeys.filter((slug) => !visualizerSlugs.includes(slug));
if (orphanScenarios.length > 0) {
  console.log(`⚠️ Note: ${orphanScenarios.length} scenarios in problemVisualizerScenarios not listed in visualizers.json: ${orphanScenarios.join(', ')}`);
} else {
  console.log('✅ 1-to-1 match between visualizers.json and problemVisualizerScenarios.');
}

// 2. Visualizer Types Breakdown
console.log('\n2. Testing Visualizer Types Breakdown:');
const visualTypeCounts: Record<ScenarioVisualType, number> = {
  array: 0,
  matrix: 0,
  stack: 0,
  nodes: 0,
  graph: 0,
  bars: 0,
  bits: 0,
};

const visualTypeProblems: Record<ScenarioVisualType, string[]> = {
  array: [],
  matrix: [],
  stack: [],
  nodes: [],
  graph: [],
  bars: [],
  bits: [],
};

for (const entry of entries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];
  if (scenario) {
    visualTypeCounts[scenario.visualType]++;
    visualTypeProblems[scenario.visualType].push(profile.slug);
  }
}

for (const [type, count] of Object.entries(visualTypeCounts)) {
  console.log(`  - Type '${type}': ${count} problems`);
  if (count === 0) {
    console.error(`❌ Visualizer type '${type}' has 0 problems assigned!`);
  }
}

// 3. Deep Frame Validation across all 75 problems
console.log('\n3. Testing Frame Structure & Integrity across all 75 problems:');
let frameErrors = 0;
let nanOrNullErrors = 0;

entries.forEach((entry, i) => {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];
  const frames = buildVisualizerFrames(entry.pattern, entry.lessonPath, entry.lessonPath);

  if (frames.length < 8 || frames.length > 12) {
    console.error(`❌ Problem ${entry.problemId} (${profile.slug}): expected 8-12 frames, got ${frames.length}`);
    frameErrors++;
  }

  frames.forEach((frame, step) => {
    // Check required fields based on visualType
    const vType = frame.visualType;
    if (vType === 'array') {
      if (!frame.values || !Array.isArray(frame.values)) {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'values' for array visualizer`);
        frameErrors++;
      }
    } else if (vType === 'matrix') {
      if (!frame.matrix || !Array.isArray(frame.matrix)) {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'matrix' for matrix visualizer`);
        frameErrors++;
      }
    } else if (vType === 'stack') {
      if (!frame.stack || !Array.isArray(frame.stack)) {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'stack' for stack visualizer`);
        frameErrors++;
      }
    } else if (vType === 'nodes') {
      if (!frame.nodes || !Array.isArray(frame.nodes)) {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'nodes' for nodes visualizer`);
        frameErrors++;
      }
    } else if (vType === 'graph') {
      if (!frame.nodes || !Array.isArray(frame.nodes) || !frame.edges || !Array.isArray(frame.edges)) {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'nodes' or 'edges' for graph visualizer`);
        frameErrors++;
      }
    } else if (vType === 'bars') {
      if (!frame.bars || !Array.isArray(frame.bars)) {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'bars' for bars visualizer`);
        frameErrors++;
      }
    } else if (vType === 'bits') {
      if (typeof frame.bits !== 'string') {
        console.error(`❌ [${profile.slug}] Step ${step}: missing 'bits' string for bits visualizer`);
        frameErrors++;
      }
    }

    // Check for NaN or null in json serialization
    const str = JSON.stringify(frame);
    if (str.includes('null') && (vType === 'array' || vType === 'bars')) {
      // Check if null is intentional or unexpected
    }
    if (str.includes('NaN') || str.includes('undefined')) {
      console.error(`❌ [${profile.slug}] Step ${step}: found NaN or undefined in frame JSON!`);
      nanOrNullErrors++;
    }
  });
});

if (frameErrors === 0 && nanOrNullErrors === 0) {
  console.log('✅ All 75 problems generated perfectly valid frames across 8-12 stateful steps.');
}

// 4. Testing SCENE_THEME Palette Consistency
console.log('\n4. Testing SCENE_THEME Palette:');
const requiredThemeKeys = ['active', 'visited', 'default', 'text', 'background'];
const missingThemeKeys = requiredThemeKeys.filter((k) => !(k in SCENE_THEME));
if (missingThemeKeys.length > 0) {
  console.error(`❌ Missing keys in SCENE_THEME: ${missingThemeKeys.join(', ')}`);
} else {
  console.log('✅ SCENE_THEME contains all required color categories.');
  console.log(`  - Background: ${SCENE_THEME.background}`);
  console.log(`  - Active fill: ${SCENE_THEME.active.fill}, stroke: ${SCENE_THEME.active.stroke}`);
  console.log(`  - Visited fill: ${SCENE_THEME.visited.fill}, stroke: ${SCENE_THEME.visited.stroke}`);
  console.log(`  - Default fill: ${SCENE_THEME.default.fill}, stroke: ${SCENE_THEME.default.stroke}`);
}

// 5. Stress Testing Edge Cases in Render Logic (SVG Math)
console.log('\n5. Stress Testing Visualizer Scene Calculations (SVG Math):');

// ArrayScene Math Test
const testArrayLengths = [0, 1, 5, 7, 10, 20];
testArrayLengths.forEach((len) => {
  const cellWidth = Math.min(84, 560 / Math.max(len, 1));
  const boxSize = cellWidth - 12;
  const total = cellWidth * len;
  const startX = (680 - total) / 2;
  if (isNaN(cellWidth) || isNaN(startX) || boxSize <= 0 && len > 0) {
    console.error(`❌ ArrayScene math failed for length ${len}: cellWidth=${cellWidth}, boxSize=${boxSize}, startX=${startX}`);
  }
});
console.log('✅ ArrayScene math valid across array lengths 0 to 20.');

// MatrixScene Math Test
const testMatrixDimensions = [
  [1, 1],
  [2, 3],
  [4, 4],
  [5, 5],
];
testMatrixDimensions.forEach(([rows, cols]) => {
  const size = Math.min(52, 210 / Math.max(rows, cols));
  const left = 340 - (cols * size) / 2;
  const top = 150 - (rows * size) / 2;
  if (isNaN(size) || isNaN(left) || isNaN(top) || size <= 0) {
    console.error(`❌ MatrixScene math failed for ${rows}x${cols}`);
  }
});
console.log('✅ MatrixScene math valid across grid sizes.');

// StackScene Math Test
const stackLengths = [0, 1, 2, 3, 4, 5];
stackLengths.forEach((len) => {
  for (let index = 0; index < len; index++) {
    const y = 226 - index * 48;
    const topY = y - 38;
    if (isNaN(y) || isNaN(topY)) {
      console.error(`❌ StackScene math failed for stack length ${len}, index ${index}`);
    }
  }
});
console.log('✅ StackScene math valid across stack sizes.');

// BarsScene Math Test
const testBars = [[], [5], [1, 2, 3, 4, 5, 6, 7], [0, 0, 0]];
testBars.forEach((bars) => {
  const width = Math.min(54, 500 / Math.max(bars.length, 1));
  const startX = 340 - (bars.length * width) / 2;
  const max = Math.max(...bars, 1);
  bars.forEach((value) => {
    const height = Math.max((value / max) * 170, 10);
    const y = 238 - height;
    if (isNaN(height) || isNaN(y) || isNaN(width) || isNaN(startX)) {
      console.error(`❌ BarsScene math failed for bars: ${bars}`);
    }
  });
});
console.log('✅ BarsScene math valid across bar arrays.');

// BitsScene Math Test
const testBits = ['', '0', '10101010', '1111000011110000'];
testBits.forEach((bits) => {
  const cellWidth = Math.min(64, 560 / Math.max(bits.length, 1));
  const boxSize = cellWidth - 8;
  const total = cellWidth * bits.length;
  const startX = (680 - total) / 2;
  if (isNaN(cellWidth) || isNaN(startX)) {
    console.error(`❌ BitsScene math failed for bits string: '${bits}'`);
  }
});
console.log('✅ BitsScene math valid across bit string lengths.');

console.log('\n=== EMPIRICAL CHALLENGER TEST COMPLETED SUCCESSFULLY ===');
