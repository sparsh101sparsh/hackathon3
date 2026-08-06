import fs from 'node:fs';
import { buildVisualizerFrames, LessonFrame } from '../components/problems/ProblemVisualizer';
import { getVisualizerLesson } from '../components/problems/visualizerLessons';
import { problemVisualizerScenarios } from '../components/problems/problemVisualizerScenarios';

type Entry = { problemId: string; pattern: string; lessonPath: string; hasVisualizer: boolean };

const entries = Object.values(JSON.parse(fs.readFileSync('public/data/visualizers.json', 'utf8'))) as Entry[];

interface Issue {
  problemId: string;
  pattern: string;
  visualType: string;
  step: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  details: string;
}

const issues: Issue[] = [];
const typeCounts: Record<string, number> = {
  array: 0,
  matrix: 0,
  stack: 0,
  nodes: 0,
  graph: 0,
  bars: 0,
  bits: 0,
};

console.log(`=======================================================`);
console.log(`EMPIRICAL STRESS TEST: 75 PROBLEM VISUALIZERS (R1)`);
console.log(`=======================================================\n`);

// 1. Catalog & Scenario Mapping Checks
const scenarioKeys = Object.keys(problemVisualizerScenarios);
console.log(`Total catalog entries in visualizers.json: ${entries.length}`);
console.log(`Total scenario entries in problemVisualizerScenarios: ${scenarioKeys.length}`);

for (const entry of entries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];

  if (!scenario) {
    issues.push({
      problemId: entry.problemId,
      pattern: entry.pattern,
      visualType: 'unknown',
      step: -1,
      severity: 'CRITICAL',
      category: 'MISSING_SCENARIO',
      details: `No scenario mapping found in problemVisualizerScenarios for slug "${profile.slug}"`,
    });
    continue;
  }

  typeCounts[scenario.visualType] = (typeCounts[scenario.visualType] || 0) + 1;
}

console.log('\nVisualType Distribution:');
for (const [type, count] of Object.entries(typeCounts)) {
  console.log(`  - ${type}: ${count} problems`);
}

// 2. Frame-by-Frame Geometry & Container Bound Stress Testing
let totalFramesTested = 0;

for (const entry of entries) {
  const profile = getVisualizerLesson(entry.lessonPath, entry.pattern);
  const scenario = problemVisualizerScenarios[profile.slug];
  if (!scenario) continue;

  const frames = buildVisualizerFrames(entry.pattern, entry.lessonPath, entry.lessonPath);

  if (frames.length < 8 || frames.length > 12) {
    issues.push({
      problemId: entry.problemId,
      pattern: entry.pattern,
      visualType: scenario.visualType,
      step: -1,
      severity: 'HIGH',
      category: 'FRAME_COUNT',
      details: `Expected 8-12 frames, got ${frames.length}`,
    });
  }

  frames.forEach((frame, stepIndex) => {
    totalFramesTested++;
    const vt = frame.visualType;

    // Check codeLine bounds
    if (frame.codeLine < 1 || frame.codeLine > profile.code.length) {
      issues.push({
        problemId: entry.problemId,
        pattern: entry.pattern,
        visualType: vt,
        step: stepIndex,
        severity: 'MEDIUM',
        category: 'INVALID_CODE_LINE',
        details: `codeLine ${frame.codeLine} out of bounds (1..${profile.code.length})`,
      });
    }

    // Check commentary non-empty
    if (!frame.commentary || frame.commentary.trim().length === 0) {
      issues.push({
        problemId: entry.problemId,
        pattern: entry.pattern,
        visualType: vt,
        step: stepIndex,
        severity: 'MEDIUM',
        category: 'EMPTY_COMMENTARY',
        details: `Step ${stepIndex} commentary is empty`,
      });
    }

    // Geometry Simulation for SVG Container (680 x 300)
    if (vt === 'array') {
      const values = frame.values || [];
      if (values.length === 0) {
        issues.push({
          problemId: entry.problemId,
          pattern: entry.pattern,
          visualType: vt,
          step: stepIndex,
          severity: 'HIGH',
          category: 'EMPTY_DATA',
          details: `ArrayScene frame.values is empty`,
        });
      } else {
        const cellWidth = Math.min(84, 560 / Math.max(values.length, 1));
        const boxSize = cellWidth - 12;
        const totalWidth = cellWidth * values.length;
        const startX = (680 - totalWidth) / 2;
        const endX = startX + totalWidth;

        if (startX < 0 || endX > 680 || boxSize <= 0) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'CONTAINER_OVERFLOW',
            details: `ArrayScene bounds overflow: startX=${startX.toFixed(1)}, endX=${endX.toFixed(1)}, boxSize=${boxSize.toFixed(1)}`,
          });
        }

        // Pointer index bounds check
        if (frame.pointers) {
          for (const [pName, pIdx] of Object.entries(frame.pointers)) {
            if (pIdx < 0 || pIdx >= values.length) {
              issues.push({
                problemId: entry.problemId,
                pattern: entry.pattern,
                visualType: vt,
                step: stepIndex,
                severity: 'HIGH',
                category: 'POINTER_OUT_OF_BOUNDS',
                details: `Pointer "${pName}" index ${pIdx} out of range [0..${values.length - 1}]`,
              });
            }
          }
        }
      }
    } else if (vt === 'matrix') {
      const matrix = frame.matrix || [];
      if (matrix.length === 0 || matrix[0].length === 0) {
        issues.push({
          problemId: entry.problemId,
          pattern: entry.pattern,
          visualType: vt,
          step: stepIndex,
          severity: 'HIGH',
          category: 'EMPTY_DATA',
          details: `MatrixScene frame.matrix is empty`,
        });
      } else {
        const rows = matrix.length;
        const cols = Math.max(...matrix.map((row) => row.length), 1);
        const size = Math.min(52, 210 / Math.max(rows, cols));
        const left = 340 - (cols * size) / 2;
        const top = 150 - (rows * size) / 2;
        const right = left + cols * size;
        const bottom = top + rows * size;

        if (left < 0 || right > 680 || top < 0 || bottom > 300) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'CONTAINER_OVERFLOW',
            details: `MatrixScene overflow: left=${left.toFixed(1)}, right=${right.toFixed(1)}, top=${top.toFixed(1)}, bottom=${bottom.toFixed(1)}`,
          });
        }
      }
    } else if (vt === 'stack') {
      const stack = frame.stack || [];
      if (stack.length > 0) {
        const topY = 226 - (stack.length - 1) * 48 - 38;
        if (topY < 0) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'MEDIUM',
            category: 'CONTAINER_OVERFLOW',
            details: `StackScene top element overflow: topY=${topY} (< 0)`,
          });
        }
      }
    } else if (vt === 'nodes') {
      const nodes = frame.nodes || [];
      if (nodes.length === 0) {
        issues.push({
          problemId: entry.problemId,
          pattern: entry.pattern,
          visualType: vt,
          step: stepIndex,
          severity: 'HIGH',
          category: 'EMPTY_DATA',
          details: `NodeScene frame.nodes is empty`,
        });
      } else {
        const gap = Math.min(104, 560 / Math.max(nodes.length, 1));
        const startX = 340 - ((nodes.length - 1) * gap) / 2;
        const endX = startX + (nodes.length - 1) * gap;

        if (startX - 31 < 0 || endX + 31 > 680) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'CONTAINER_OVERFLOW',
            details: `NodeScene overflow: startX=${(startX - 31).toFixed(1)}, endX=${(endX + 31).toFixed(1)}`,
          });
        }
      }
    } else if (vt === 'graph') {
      const nodes = frame.nodes || [];
      const edges = frame.edges || [];
      const positions = nodes.map((_, idx) => [[150, 150], [310, 78], [310, 222], [510, 78], [510, 222]][idx] || [340, 150]);

      if (nodes.length === 0) {
        issues.push({
          problemId: entry.problemId,
          pattern: entry.pattern,
          visualType: vt,
          step: stepIndex,
          severity: 'HIGH',
          category: 'EMPTY_DATA',
          details: `GraphScene frame.nodes is empty`,
        });
      }

      edges.forEach(([from, to], edgeIdx) => {
        if (from < 0 || from >= nodes.length || to < 0 || to >= nodes.length) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'INVALID_EDGE_INDEX',
            details: `GraphScene edge ${edgeIdx} (${from} -> ${to}) invalid for ${nodes.length} nodes`,
          });
        }
      });
    } else if (vt === 'bars') {
      const bars = frame.bars || [];
      if (bars.length === 0) {
        issues.push({
          problemId: entry.problemId,
          pattern: entry.pattern,
          visualType: vt,
          step: stepIndex,
          severity: 'HIGH',
          category: 'EMPTY_DATA',
          details: `BarsScene frame.bars is empty`,
        });
      } else {
        const width = Math.min(54, 500 / Math.max(bars.length, 1));
        const startX = 340 - (bars.length * width) / 2;
        const endX = startX + bars.length * width;

        if (startX < 0 || endX > 680) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'CONTAINER_OVERFLOW',
            details: `BarsScene overflow: startX=${startX.toFixed(1)}, endX=${endX.toFixed(1)}`,
          });
        }

        const maxVal = Math.max(...bars, 1);
        if (isNaN(maxVal) || maxVal === 0) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'INVALID_BAR_VALUES',
            details: `BarsScene max value is ${maxVal}`,
          });
        }
      }
    } else if (vt === 'bits') {
      const bits = frame.bits || '';
      if (bits.length === 0) {
        issues.push({
          problemId: entry.problemId,
          pattern: entry.pattern,
          visualType: vt,
          step: stepIndex,
          severity: 'HIGH',
          category: 'EMPTY_DATA',
          details: `BitsScene frame.bits is empty`,
        });
      } else {
        const cellWidth = Math.min(64, 560 / Math.max(bits.length, 1));
        const boxSize = cellWidth - 8;
        const total = cellWidth * bits.length;
        const startX = (680 - total) / 2;
        const endX = startX + total;

        if (startX < 0 || endX > 680 || boxSize <= 0) {
          issues.push({
            problemId: entry.problemId,
            pattern: entry.pattern,
            visualType: vt,
            step: stepIndex,
            severity: 'HIGH',
            category: 'CONTAINER_OVERFLOW',
            details: `BitsScene overflow: startX=${startX.toFixed(1)}, endX=${endX.toFixed(1)}, boxSize=${boxSize.toFixed(1)}`,
          });
        }
      }
    }
  });
}

console.log(`Total frames tested: ${totalFramesTested}`);
console.log(`Total issues detected: ${issues.length}\n`);

if (issues.length > 0) {
  console.log('--- ISSUES SUMMARY ---');
  for (const issue of issues) {
    console.log(`[${issue.severity}] ${issue.problemId} (${issue.pattern} / ${issue.visualType}) Step ${issue.step}: [${issue.category}] ${issue.details}`);
  }
} else {
  console.log(`✅ ALL 75 PROBLEMS AND ${totalFramesTested} FRAMES PASSED BOUNDS AND GEOMETRY CHECKS!`);
}
