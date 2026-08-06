'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getVisualizerLesson } from './visualizerLessons';
import { problemVisualizerScenarios, ProblemVisualizerScenario } from './problemVisualizerScenarios';
import { VisualizerScene } from './VisualizerScene';
import { VisualizerTutor } from './VisualizerTutor';

export type VisualType = 'array' | 'matrix' | 'stack' | 'nodes' | 'graph' | 'bars' | 'bits';

interface VisualizerConfig {
  pattern: string;
  lessonPath: string;
  hasVisualizer: boolean;
}

export interface LessonFrame {
  visualType: VisualType;
  values?: (string | number)[];
  matrix?: (string | number)[][];
  stack?: (string | number)[];
  nodes?: string[];
  edges?: [number, number][];
  active?: number[];
  pointers?: Record<string, number>;
  bars?: number[];
  bits?: string;
  codeLine: number;
  commentary: string;
  state: { label: string; value: string }[];
}

interface ProblemVisualizerProps {
  problemId: string;
  problemTitle: string;
  topicTags?: string | string[];
  verified?: boolean;
  embedded?: boolean;
  compact?: boolean;
}

const patternNames: Record<string, string> = {
  'two-pointers': 'Two Pointers',
  'arrays-hashing': 'Arrays & Hashing',
  'sliding-window': 'Sliding Window',
  stack: 'Stack',
  'linked-list': 'Linked List',
  heap: 'Heap',
  'binary-search': 'Binary Search',
  dfs: 'Depth-First Search',
  bfs: 'Breadth-First Search',
  graphs: 'Graphs',
  dp: 'Dynamic Programming',
  backtracking: 'Backtracking',
  greedy: 'Greedy',
  intervals: 'Intervals',
  'prefix-sum': 'Prefix Sum',
  matrices: 'Matrix Traversal',
  'bit-manipulation': 'Bit Manipulation',
};

const defaultValues = [3, 8, 12, 17, 21, 26, 30];

function sampleValues(slug: string, fallback: number[]) {
  const samples: Record<string, number[]> = {
    'two-sum': [2, 7, 11, 15],
    'move-zeroes': [0, 1, 0, 3, 12],
    'split-array-largest-sum': [7, 2, 5, 10, 8],
    'jump-game': [2, 3, 1, 1, 4],
    'valid-palindrome': [1, 0, 1, 0, 1],
    'climbing-stairs': [1, 1, 2, 3, 5, 8],
    'decode-ways': [2, 2, 6],
    'find-k-closest-elements': [1, 2, 3, 4, 5],
    'valid-triangle-number': [2, 2, 3, 4],
    'subarray-sum-equals-k': [1, 1, 1],
    'permutation-in-string': [5, 9, 4, 2, 1, 0, 0, 0],
    'word-break': [1, 0, 0, 0, 1, 0, 0, 0, 1],
    'binary-search': [-1, 0, 3, 5, 9, 12],
    'container-with-most-water': [1, 8, 6, 2, 5, 4, 8, 3, 7],
    'trapping-rain-water': [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
    'jump-game-ii': [2, 3, 1, 1, 4],
    'sort-colors': [2, 0, 2, 1, 1, 0],
    'house-robber': [2, 7, 9, 3, 1],
    'coin-change': [1, 2, 5, 6, 11],
    'merge-intervals': [1, 3, 2, 6, 8, 10],
    'insert-interval': [1, 3, 2, 5, 6, 9],
    'non-overlapping-intervals': [1, 2, 1, 3, 2, 3],
    'gas-station': [1, 2, 3, 4, 5],
    'task-scheduler': [3, 3, 2, 1, 1, 1],
    'longest-increasing-subsequence': [10, 9, 2, 5, 3, 7, 101, 18],
    'merge-k-sorted-lists': [1, 1, 2, 3, 4, 4],
    'group-anagrams': [3, 3, 3, 2, 2, 1],
    'valid-anagram': [1, 3, 1, 7, 1, 13],
    'sliding-window-maximum': [1, 3, -1, -3, 5, 3, 6, 7],
  };
  return samples[slug] || fallback;
}

function matrixShape(slug: string) {
  if (slug === 'maximal-square' || slug === 'number-of-islands') return { rows: 4, cols: 5 };
  if (slug === 'surrounded-regions' || slug === 'set-matrix-zeroes') return { rows: 4, cols: 4 };
  if (slug === 'flood-fill' || slug === 'rotate-image' || slug === 'spiral-matrix' || slug === '01-matrix') return { rows: 3, cols: 3 };
  if (slug === 'edit-distance') return { rows: 4, cols: 4 };
  if (slug === 'unique-paths') return { rows: 3, cols: 4 };
  return { rows: 4, cols: 4 };
}

function graphPayload(slug: string, progress: number) {
  const graphs: Record<string, { nodes: string[]; edges: [number, number][] }> = {
    'course-schedule': { nodes: ['0', '1'], edges: [[0, 1]] },
    'course-schedule-ii': { nodes: ['0', '1', '2', '3'], edges: [[0, 1], [0, 2], [1, 3], [2, 3]] },
    'redundant-connection': { nodes: ['1', '2', '3'], edges: [[0, 1], [0, 2], [1, 2]] },
    'network-delay-time': { nodes: ['1', '2', '3', '4'], edges: [[0, 1], [1, 2], [1, 3]] },
    'n-queens': { nodes: ['r0', 'r1', 'r2', 'r3'], edges: [[0, 1], [1, 2], [2, 3]] },
    'word-ladder': { nodes: ['hit', 'hot', 'dot', 'dog', 'cog'], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  };
  const graph = graphs[slug] || { nodes: ['A', 'B', 'C', 'D', 'E'], edges: [[0, 1], [0, 2], [1, 3], [2, 4]] };
  const activeCount = Math.min(graph.nodes.length, Math.max(1, Math.ceil(progress * graph.nodes.length)));
  return { ...graph, active: Array.from({ length: activeCount }, (_, index) => index) };
}

function stackPayload(slug: string, step: number) {
  const stacks: Record<string, (string | number)[][]> = {
    'valid-parentheses': [[], ['('], [], ['['], [], ['{'], [], []],
    'longest-valid-parentheses': [[-1], [-1, 1], [-1], [-1, 3], [-1, 3, 4], [-1, 3], [-1], [-1]],
    'daily-temperatures': [[], [0], [], [2], [2, 3], [2], [], []],
    'min-stack': [[], [-2], [-2, 0], [-2, 0, -3], [-2, 0, -3], [-2, 0], [-2], [-2]],
    'decode-string': [[], [3], [3, 'a'], [3, 'a', 2], [3, 'acc'], ['accaccacc'], ['accaccacc'], []],
  };
  const sequence = stacks[slug];
  if (sequence) return { stack: sequence[Math.min(step, sequence.length - 1)] };

  const tokens = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const progress = step / 7;
  const depth = step === 0 || step === 7 ? 0 : Math.min(tokens.length, Math.max(1, Math.ceil(progress * tokens.length)));
  return { stack: tokens.slice(0, depth) };
}

function parsePattern(topicTags: string | string[] | undefined) {
  if (Array.isArray(topicTags)) return topicTags[0]?.toLowerCase() || 'arrays-hashing';
  if (typeof topicTags === 'string') {
    try {
      const parsed = JSON.parse(topicTags);
      if (Array.isArray(parsed)) return String(parsed[0] || 'arrays-hashing').toLowerCase();
    } catch {
      return topicTags.toLowerCase();
    }
  }
  return 'arrays-hashing';
}

function frame(
  visualType: VisualType,
  codeLine: number,
  commentary: string,
  state: [string, string][],
  extra: Partial<LessonFrame> = {},
): LessonFrame {
  return { visualType, codeLine, commentary, state: state.map(([label, value]) => ({ label, value })), ...extra };
}

function currentIndexForStep(length: number, step: number, totalSteps: number) {
  const maxIndex = Math.max(0, length - 1);
  const progress = totalSteps <= 1 ? 1 : step / (totalSteps - 1);
  return Math.min(maxIndex, Math.floor(progress * maxIndex));
}

function lowerBound(values: number[], target: number) {
  let left = 0;
  let right = values.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (values[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}

function lisState(values: number[], currentIndex: number, includeCurrent: boolean): [string, string][] {
  const tails: number[] = [];
  const end = includeCurrent ? currentIndex : currentIndex - 1;
  for (let index = 0; index <= end; index += 1) {
    const value = values[index];
    const position = lowerBound(tails, value);
    tails[position] = value;
  }

  const currentValue = values[currentIndex];
  const position = lowerBound(tails, currentValue);
  return [
    ['current', `${currentIndex}:${currentValue}`],
    ['position', String(position)],
    ['tails', `[${tails.join(',')}]`],
  ];
}

function scenarioData(type: VisualType, slug: string, base: number[], step: number, totalSteps = 8): Partial<LessonFrame> {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const values = sampleValues(slug, base);
  const maxIndex = Math.max(0, base.length - 1);
  const progress = totalSteps <= 1 ? 1 : step / (totalSteps - 1);
  const valueMaxIndex = Math.max(0, values.length - 1);
  const cursor = Math.min(valueMaxIndex, Math.round(progress * valueMaxIndex));
  const pairCursor = Math.min(valueMaxIndex, Math.floor(progress * valueMaxIndex));
  const active = Array.from(new Set([
    Math.max(0, pairCursor - 1),
    pairCursor,
    Math.min(valueMaxIndex, pairCursor + 1),
  ])).filter((index) => index >= 0 && index <= valueMaxIndex);

  if (type === 'array') {
    const pointers: Record<string, number> | undefined = slug.includes('binary-search')
      ? {
          lo: step < 2 ? 0 : step < 4 ? 2 : step < 6 ? 3 : 4,
          mid: step < 2 ? 2 : step < 4 ? 3 : 4,
          hi: step < 2 ? Math.min(5, valueMaxIndex) : step < 4 ? Math.min(5, valueMaxIndex) : step < 6 ? 4 : 4,
        }
      : slug.includes('palindrome') || slug.includes('container') || slug.includes('triangle') || slug.includes('two-sum')
        ? { L: Math.min(3, Math.floor(progress * 3)), R: Math.max(3, valueMaxIndex - Math.floor(progress * 3)) }
        : slug.includes('window') || slug.includes('permutation') || slug.includes('subarray')
          ? { L: Math.max(0, cursor - 2), R: cursor }
        : undefined;
    const pointerActive = pointers ? Object.values(pointers) : active;
    return { values, active: Array.from(new Set(pointerActive)).filter((index) => index >= 0 && index <= valueMaxIndex), pointers };
  }

  if (type === 'matrix') {
    const { rows, cols } = matrixShape(slug);
    const cellCount = rows * cols;
    const center = Math.min(cellCount - 1, Math.round(progress * (cellCount - 1)));
    const threshold = Math.max(center, Math.floor(progress * (cellCount - 1)));
    const matrix = Array.from({ length: rows }, (_, rowIndex) => Array.from({ length: cols }, (_, colIndex) => {
      const value = (hash + rowIndex * 7 + colIndex * 3) % 2;
      const flat = rowIndex * cols + colIndex;
      return flat <= threshold ? 1 : value;
    }));
    const rowIndex = Math.floor(center / cols);
    const colIndex = center % cols;
    const matrixActive = [
      center,
      rowIndex > 0 ? center - cols : center,
      colIndex > 0 ? center - 1 : center,
      rowIndex > 0 && colIndex > 0 ? center - cols - 1 : center,
    ];
    return { matrix, active: Array.from(new Set(matrixActive)).filter((index) => index >= 0 && index < cellCount) };
  }

  if (type === 'stack') {
    return stackPayload(slug, step);
  }

  if (type === 'nodes') {
    const suffix = slug.split('-').map((part) => part[0]?.toUpperCase() || '').join('').slice(0, 2);
    const nodes = ['HEAD', suffix || 'A', 'B', 'C', 'TAIL'];
    const nodeCursor = Math.min(nodes.length - 1, Math.round(progress * (nodes.length - 1)));
    return { nodes, active: Array.from(new Set([Math.max(0, nodeCursor - 1), nodeCursor])).filter((index) => index < nodes.length) };
  }

  if (type === 'graph') {
    return graphPayload(slug, progress);
  }

  if (type === 'bars') {
    const bars = values.slice(0, 12);
    const barActive = slug === 'longest-increasing-subsequence'
      ? [currentIndexForStep(bars.length, step, totalSteps)]
      : active;
    return { bars, active: barActive };
  }

  const bits = ((hash >>> 0).toString(2).padStart(8, '0').slice(-8));
  const shift = Math.min(7, step);
  return { bits: shift === 0 ? bits : bits.slice(shift) + '0'.repeat(shift) };
}

function describePayload(type: VisualType, payload: Partial<LessonFrame>): string {
  if (type === 'array' && payload.values) {
    const pointers = Object.entries(payload.pointers || {})
      .map(([name, index]) => `${name}=${index} (${payload.values?.[index]})`)
      .join(', ');
    const active = (payload.active || []).map((index) => `${index}:${payload.values?.[index]}`).join(', ');
    return pointers || `active indices ${active}`;
  }
  if (type === 'matrix' && payload.matrix) {
    const cols = Math.max(...payload.matrix.map((row) => row.length), 1);
    const active = (payload.active || []).map((index) => `(${Math.floor(index / cols)},${index % cols})=${payload.matrix?.[Math.floor(index / cols)]?.[index % cols]}`).join(', ');
    return `active cells ${active}`;
  }
  if (type === 'stack') {
    const stack = payload.stack || [];
    return stack.length ? `stack top ${stack[stack.length - 1]} with depth ${stack.length}` : 'the stack is empty';
  }
  if ((type === 'nodes' || type === 'graph') && payload.nodes) {
    const active = (payload.active || []).map((index) => payload.nodes?.[index]).filter(Boolean).join(', ');
    return `active nodes ${active || payload.nodes[0]}`;
  }
  if (type === 'bars' && payload.bars) {
    const active = (payload.active || []).map((index) => `${index}:${payload.bars?.[index]}`).join(', ');
    return `active bars ${active}`;
  }
  if (type === 'bits') return `bits ${payload.bits}`;
  return 'the highlighted state';
}

function visualState(type: VisualType, payload: Partial<LessonFrame>, step: number): [string, string][] {
  if (type === 'array' && payload.values) {
    const active = (payload.active || []).map((index) => `${index}:${payload.values?.[index]}`).join(', ');
    return [['active', active || 'none'], ['cursor', String(payload.active?.[0] ?? step)]];
  }
  if (type === 'matrix' && payload.matrix) {
    const cols = Math.max(...payload.matrix.map((row) => row.length), 1);
    const first = payload.active?.[0] ?? 0;
    return [['cell', `(${Math.floor(first / cols)},${first % cols})`], ['active', String((payload.active || []).length)]];
  }
  if (type === 'stack') return [['depth', String(payload.stack?.length || 0)], ['top', String(payload.stack?.at(-1) || 'empty')]];
  if ((type === 'nodes' || type === 'graph') && payload.nodes) {
    return [['active', (payload.active || []).map((index) => payload.nodes?.[index]).filter(Boolean).join(', ') || 'none'], ['visited', `${payload.active?.length || 0}`]];
  }
  if (type === 'bars' && payload.bars) {
    return [['active', (payload.active || []).map((index) => `${index}:${payload.bars?.[index]}`).join(', ') || 'none'], ['peak', String(Math.max(...payload.bars))]];
  }
  if (type === 'bits') return [['bits', payload.bits || ''], ['shift', String(step)]];
  return [['active', 'visible'], ['cursor', String(step)]];
}

function buildScenarioFrames(scenario: ProblemVisualizerScenario, slug: string, values: number[]): LessonFrame[] {
  const sourceCount = Math.min(scenario.comments.length, scenario.phases.length);
  if (sourceCount === 0) return [];

  const frames: LessonFrame[] = [];
  const total = Math.min(12, Math.max(8, sourceCount * 2));
  for (let index = 0; index < total; index += 1) {
    const sourceIndex = Math.min(sourceCount - 1, Math.floor((index / total) * sourceCount));
    const phase = scenario.phases[sourceIndex];
    const commentary = scenario.comments[sourceIndex];
    const mode = index % 2 === 0 ? 'inspect' : 'apply';
    const payload = scenarioData(scenario.visualType, slug, values, index, total);
    const payloadSummary = describePayload(scenario.visualType, payload);
    const state = visualState(scenario.visualType, payload, index);
    const semanticState = slug === 'longest-increasing-subsequence'
      ? lisState(payload.bars || values, payload.active?.[0] ?? 0, mode === 'apply')
      : state;
    const frameCommentary = mode === 'inspect'
      ? `${commentary} The frame highlights ${payloadSummary}.`
      : `${phase} is applied to ${payloadSummary}, keeping the ${slug.replaceAll('-', ' ')} invariant visible.`;
    frames.push(frame(
      scenario.visualType,
      Math.min(sourceIndex + 1 + (mode === 'apply' ? 1 : 0), 5),
      frameCommentary,
      [['phase', `${mode}: ${phase}`], ['step', `${index + 1} / ${total}`], ['focus', phase], ...semanticState],
      payload,
    ));
  }
  return frames;
}

function buildPatternFrames(pattern: string, title: string, lessonValues = defaultValues): LessonFrame[] {
  const lowerTitle = title.toLowerCase();
  const base = lessonValues;

  if (pattern === 'two-pointers' || lowerTitle.includes('two sum')) {
    return [
      frame('array', 1, 'Start at both ends. The search space is the full array.', [['left', '0'], ['right', '6'], ['sum', '33']], { values: base, active: [0, 6], pointers: { L: 0, R: 6 } }),
      frame('array', 3, '33 is too large, so move the right pointer inward.', [['left', '0'], ['right', '5'], ['sum', '29']], { values: base, active: [0, 5], pointers: { L: 0, R: 5 } }),
      frame('array', 4, '24 is still larger than the target. Keep shrinking from the right.', [['left', '0'], ['right', '4'], ['sum', '24']], { values: base, active: [0, 4], pointers: { L: 0, R: 4 } }),
      frame('array', 5, '20 is the first useful boundary. Advance left to make the sum larger.', [['left', '1'], ['right', '4'], ['sum', '20']], { values: base, active: [1, 4], pointers: { L: 1, R: 4 } }),
      frame('array', 6, '17 + 21 = 38. The converging pointers finish the search without backtracking.', [['left', '3'], ['right', '4'], ['answer', 'found']], { values: base, active: [3, 4], pointers: { L: 3, R: 4 } }),
    ];
  }

  if (pattern === 'sliding-window') {
    return [
      frame('array', 1, 'Open a window at the first element.', [['left', '0'], ['right', '0'], ['best', '3']], { values: base, active: [0], pointers: { L: 0, R: 0 } }),
      frame('array', 2, 'Expand right. The window now contains two candidates.', [['left', '0'], ['right', '2'], ['window', '3..12']], { values: base, active: [0, 1, 2], pointers: { L: 0, R: 2 } }),
      frame('array', 3, 'The window breaks its condition, so repair it from the left.', [['left', '1'], ['right', '3'], ['window', '8..17']], { values: base, active: [1, 2, 3], pointers: { L: 1, R: 3 } }),
      frame('array', 4, 'Record the valid window, then expand again.', [['left', '2'], ['right', '5'], ['best', '21']], { values: base, active: [2, 3, 4, 5], pointers: { L: 2, R: 5 } }),
    ];
  }

  if (pattern === 'binary-search') {
    return [
      frame('array', 1, 'Keep the answer inside the inclusive search interval.', [['lo', '0'], ['mid', '3'], ['hi', '6']], { values: base, active: [0, 3, 6], pointers: { lo: 0, mid: 3, hi: 6 } }),
      frame('array', 3, 'The midpoint is too small. Discard the left half.', [['lo', '4'], ['mid', '5'], ['hi', '6']], { values: base, active: [4, 5, 6], pointers: { lo: 4, mid: 5, hi: 6 } }),
      frame('array', 4, 'The interval has collapsed to the answer candidate.', [['lo', '5'], ['mid', '5'], ['hi', '5']], { values: base, active: [5], pointers: { lo: 5, mid: 5, hi: 5 } }),
    ];
  }

  if (pattern === 'stack') {
    return [
      frame('stack', 1, 'Read the next token. The stack remembers unresolved work.', [['token', '('], ['top', '('], ['depth', '1']], { stack: ['('] }),
      frame('stack', 2, 'A matching closer resolves the most recent opener first.', [['token', ')'], ['top', '('], ['depth', '0']], { stack: [] }),
      frame('stack', 4, 'Push the next nested pair; last in is first out.', [['token', '['], ['top', '['], ['depth', '1']], { stack: ['['] }),
      frame('stack', 5, 'The empty stack confirms every pair was resolved.', [['token', 'done'], ['valid', 'true'], ['depth', '0']], { stack: [] }),
    ];
  }

  if (pattern === 'linked-list') {
    return [
      frame('nodes', 1, 'Keep a stable previous pointer while current walks the list.', [['prev', 'null'], ['current', 'A'], ['next', 'B']], { nodes: ['A', 'B', 'C', 'D'], active: [0] }),
      frame('nodes', 2, 'Save next before changing the arrow.', [['prev', 'A'], ['current', 'B'], ['next', 'C']], { nodes: ['A', 'B', 'C', 'D'], active: [1] }),
      frame('nodes', 3, 'Reverse one link, then advance both pointers.', [['prev', 'B'], ['current', 'C'], ['next', 'D']], { nodes: ['B', 'A', 'C', 'D'], active: [1, 2] }),
      frame('nodes', 5, 'When current is null, prev is the new head.', [['head', 'D'], ['current', 'null'], ['links', 'reversed']], { nodes: ['D', 'C', 'B', 'A'], active: [0] }),
    ];
  }

  if (pattern === 'dp') {
    return [
      frame('matrix', 1, 'Start with the smallest subproblem and write its base case.', [['row', '0'], ['col', '0'], ['value', '1']], { matrix: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]], active: [0] }),
      frame('matrix', 2, 'Each cell reuses answers from its already-solved neighbors.', [['row', '1'], ['col', '1'], ['value', '2']], { matrix: [[1, 1, 1, 1], [1, 2, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]], active: [0, 1, 4, 5] }),
      frame('matrix', 3, 'Fill the table left to right, top to bottom.', [['row', '2'], ['col', '2'], ['value', '3']], { matrix: [[1, 1, 1, 1], [1, 2, 2, 2], [1, 2, 3, 0], [1, 2, 0, 0]], active: [5, 6, 9, 10] }),
      frame('matrix', 5, 'The final cell contains the answer assembled from smaller states.', [['answer', '4'], ['time', 'O(mn)'], ['space', 'O(mn)']], { matrix: [[1, 1, 1, 1], [1, 2, 2, 2], [1, 2, 3, 3], [1, 2, 3, 4]], active: [15] }),
    ];
  }

  if (pattern === 'backtracking') {
    return [
      frame('nodes', 1, 'Choose a candidate and descend one level in the decision tree.', [['path', '[]'], ['depth', '0'], ['choices', '3']], { nodes: ['start', '1', '2', '3'], active: [0] }),
      frame('nodes', 2, 'Commit to 1. The remaining choices form a smaller problem.', [['path', '[1]'], ['depth', '1'], ['choices', '2']], { nodes: ['start', '1', '2', '3'], active: [0, 1] }),
      frame('nodes', 3, 'Try 2, then recurse again. Each branch owns its local state.', [['path', '[1, 2]'], ['depth', '2'], ['choices', '1']], { nodes: ['start', '1', '2', '3'], active: [0, 1, 2] }),
      frame('nodes', 5, 'Undo the last choice and return to the previous branch.', [['path', '[1]'], ['depth', '1'], ['backtrack', 'yes']], { nodes: ['start', '1', '2', '3'], active: [0, 1] }),
    ];
  }

  if (pattern === 'greedy' || pattern === 'intervals') {
    return [
      frame('bars', 1, 'Sort or scan candidates so the locally best choice is visible.', [['current', '3'], ['best', '3'], ['covered', '1']], { bars: [3, 6, 4, 9, 5, 7], active: [0] }),
      frame('bars', 2, 'Take the choice that leaves the most room for what comes next.', [['current', '6'], ['best', '6'], ['covered', '2']], { bars: [3, 6, 4, 9, 5, 7], active: [1, 2] }),
      frame('bars', 3, 'A larger next candidate replaces the previous best.', [['current', '9'], ['best', '9'], ['covered', '4']], { bars: [3, 6, 4, 9, 5, 7], active: [3, 4] }),
      frame('bars', 5, 'The greedy invariant holds through the final candidate.', [['answer', '9'], ['time', 'O(n log n)'], ['space', 'O(1)']], { bars: [3, 6, 4, 9, 5, 7], active: [3] }),
    ];
  }

  if (pattern === 'graphs' || pattern === 'dfs' || pattern === 'bfs') {
    return [
      frame('graph', 1, 'Begin at the source and mark it before exploring neighbors.', [['current', 'A'], ['visited', '{A}'], ['frontier', '{B, C}']], { nodes: ['A', 'B', 'C', 'D', 'E'], edges: [[0, 1], [0, 2], [1, 3], [2, 4]], active: [0] }),
      frame('graph', 2, 'Visit B. Its unvisited neighbor enters the frontier.', [['current', 'B'], ['visited', '{A, B}'], ['frontier', '{C, D}']], { nodes: ['A', 'B', 'C', 'D', 'E'], edges: [[0, 1], [0, 2], [1, 3], [2, 4]], active: [0, 1] }),
      frame('graph', 3, 'Visit C next and add its remaining neighbor.', [['current', 'C'], ['visited', '{A, B, C}'], ['frontier', '{D, E}']], { nodes: ['A', 'B', 'C', 'D', 'E'], edges: [[0, 1], [0, 2], [1, 3], [2, 4]], active: [0, 1, 2] }),
      frame('graph', 5, 'The frontier is empty. Every reachable node is accounted for.', [['visited', '5 nodes'], ['frontier', '{}'], ['done', 'true']], { nodes: ['A', 'B', 'C', 'D', 'E'], edges: [[0, 1], [0, 2], [1, 3], [2, 4]], active: [0, 1, 2, 3, 4] }),
    ];
  }

  if (pattern === 'bit-manipulation') {
    return [
      frame('bits', 1, 'Inspect the least significant bit with a mask.', [['value', '0101'], ['mask', '0001'], ['answer', '0']], { bits: '0101' }),
      frame('bits', 2, 'Shift the value so the next bit moves into position.', [['value', '0010'], ['mask', '0001'], ['answer', '1']], { bits: '0010' }),
      frame('bits', 3, 'Combine the bit into the answer and continue shifting.', [['value', '0001'], ['mask', '0001'], ['answer', '2']], { bits: '0001' }),
      frame('bits', 5, 'All bits are consumed. The result came from constant-space operations.', [['value', '0000'], ['answer', '2'], ['time', 'O(log n)']], { bits: '0000' }),
    ];
  }

  if (pattern === 'matrices') {
    return [
      frame('matrix', 1, 'Anchor the traversal at the top-left cell.', [['row', '0'], ['col', '0'], ['visited', '1']], { matrix: [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], active: [0] }),
      frame('matrix', 2, 'Move across the current boundary before turning inward.', [['row', '0'], ['col', '2'], ['visited', '3']], { matrix: [[1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], active: [0, 1, 2] }),
      frame('matrix', 3, 'Turn when the next cell leaves the active boundary.', [['row', '1'], ['col', '3'], ['visited', '6']], { matrix: [[1, 1, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]], active: [3, 7] }),
      frame('matrix', 5, 'Repeat until every layer of the matrix has been visited.', [['visited', '12'], ['layers', '3'], ['done', 'true']], { matrix: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]], active: [11] }),
    ];
  }

  if (pattern === 'prefix-sum') {
    return [
      frame('array', 1, 'Build a running total so every range can be answered by subtraction.', [['index', '0'], ['prefix', '3']], { values: base, active: [0] }),
      frame('array', 2, 'Add the next value to the prefix state.', [['index', '2'], ['prefix', '23']], { values: base, active: [0, 1, 2] }),
      frame('array', 4, 'A range sum is prefix[right] minus prefix[left - 1].', [['left', '1'], ['right', '4'], ['sum', '58']], { values: base, active: [1, 2, 3, 4] }),
      frame('array', 5, 'The query is answered without rescanning the range.', [['answer', '58'], ['time', 'O(1)'], ['space', 'O(n)']], { values: base, active: [1, 2, 3, 4] }),
    ];
  }

  if (pattern === 'heap') {
    return [
      frame('bars', 1, 'Keep the best k candidates in a heap, not in the whole array.', [['heap', '[3]'], ['size', '1'], ['top', '3']], { bars: [3, 8, 4, 7, 2, 9], active: [0] }),
      frame('bars', 2, 'A larger candidate rises to the top.', [['heap', '[8, 3]'], ['size', '2'], ['top', '8']], { bars: [3, 8, 4, 7, 2, 9], active: [1] }),
      frame('bars', 3, 'When the heap grows past k, remove its weakest member.', [['heap', '[8, 7, 4]'], ['size', '3'], ['top', '8']], { bars: [3, 8, 4, 7, 2, 9], active: [1, 3, 2] }),
      frame('bars', 5, 'The heap invariant leaves the requested extreme at the root.', [['answer', '9'], ['time', 'O(n log k)'], ['space', 'O(k)']], { bars: [3, 8, 4, 7, 2, 9], active: [5] }),
    ];
  }

  return [
    frame('array', 1, 'Scan the input and keep the invariant that makes the next decision cheap.', [['index', '0'], ['best', '3']], { values: base, active: [0] }),
    frame('array', 2, 'Update the state with the current value.', [['index', '2'], ['best', '12']], { values: base, active: [2] }),
    frame('array', 4, 'The invariant carries the useful information forward.', [['index', '5'], ['best', '26']], { values: base, active: [5] }),
    frame('array', 6, 'The final state is the answer.', [['answer', '30'], ['time', 'O(n)'], ['space', 'O(1)']], { values: base, active: [6] }),
  ];
}

function decorateLessonFrames(frames: LessonFrame[], lessonPath: string, pattern: string) {
  const profile = getVisualizerLesson(lessonPath, pattern);
  return frames.map((item, index) => {
    const state = [...item.state];
    if (index === 0) state.unshift({ label: 'input', value: profile.input });
    if (index === frames.length - 1) state.push({ label: 'output', value: profile.output });
    return {
      ...item,
      codeLine: Math.min(item.codeLine, profile.code.length),
      commentary: index === 0
        ? `${profile.focus}. ${item.commentary}`
        : index === frames.length - 1
          ? `${item.commentary} Result: ${profile.output}.`
          : item.commentary,
      state,
    };
  });
}

export function buildVisualizerFrames(pattern: string, title: string, lessonPath = title): LessonFrame[] {
  const profile = getVisualizerLesson(lessonPath, pattern);
  const scenario = problemVisualizerScenarios[profile.slug];
  const frames = scenario
    ? buildScenarioFrames(scenario, profile.slug, profile.values || defaultValues)
    : buildPatternFrames(pattern, title, profile.values);
  return decorateLessonFrames(frames, lessonPath, pattern);
}

const codeByPattern: Record<string, string[]> = {
  'two-pointers': ['left = 0; right = n - 1', 'while left < right:', '  inspect arr[left] and arr[right]', '  move the pointer that improves the invariant', 'return the answer'],
  'sliding-window': ['left = 0', 'for right in range(n):', '  expand the window', '  repair while the condition is broken', '  record the best window'],
  'binary-search': ['lo = 0; hi = n - 1', 'while lo <= hi:', '  mid = (lo + hi) // 2', '  discard the impossible half', 'return the candidate'],
  stack: ['stack = []', 'for token in input:', '  inspect the top of the stack', '  push or resolve the pending work', 'return stack is empty'],
  'linked-list': ['prev = None; current = head', 'while current:', '  next = current.next', '  reverse one link', 'return prev'],
  dp: ['dp = base_cases()', 'for each subproblem:', '  read solved neighbors', '  write the current state', 'return dp[target]'],
  backtracking: ['def search(state):', '  if state is complete:', '    record the answer', '  choose -> recurse -> undo', 'return all answers'],
  graphs: ['frontier = [source]', 'while frontier:', '  current = remove frontier head', '  visit unvisited neighbors', 'return visited'],
  dfs: ['def dfs(node):', '  mark node visited', '  for neighbor in node.neighbors:', '    dfs(neighbor)', 'return'],
  bfs: ['queue = [source]', 'while queue:', '  current = queue.pop(0)', '  enqueue unvisited neighbors', 'return distance'],
};

function codeFor(pattern: string, lessonPath?: string) {
  if (lessonPath) return getVisualizerLesson(lessonPath, pattern).code;
  return codeByPattern[pattern] || ['state = initial_state()', 'for item in input:', '  inspect the invariant', '  update the state', 'return answer'];
}

function stateValue(frameItem: LessonFrame | undefined, label: string) {
  return frameItem?.state.find((item) => item.label === label)?.value;
}

export const ProblemVisualizer: React.FC<ProblemVisualizerProps> = ({ problemId, problemTitle, topicTags, verified = false, embedded = false, compact = false }) => {
  const [config, setConfig] = useState<VisualizerConfig | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'concept' | 'practice'>('concept');
  const [speed, setSpeed] = useState(1200);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/data/visualizers.json')
      .then((response) => response.json())
      .then((data) => mounted && setConfig(data[problemId] || null))
      .catch(() => mounted && setConfig(null));
    return () => { mounted = false; };
  }, [problemId]);

  const pattern = config?.pattern || parsePattern(topicTags);
  const lessonPath = config?.lessonPath || problemTitle;
  const frames = useMemo(() => buildVisualizerFrames(pattern, problemTitle, lessonPath), [pattern, problemTitle, lessonPath]);
  const isVerified = verified || Boolean(config?.hasVisualizer);
  const code = codeFor(pattern, lessonPath);
  const boundedStep = Math.min(step, frames.length - 1);
  const current = frames[boundedStep];
  const currentPhase = stateValue(current, 'phase') || `step ${boundedStep + 1}`;
  const frameKey = `${problemId}:${lessonPath}:${boundedStep}:${currentPhase}:${current.codeLine}`;
  const progress = (boundedStep / Math.max(frames.length - 1, 1)) * 100;
  const shellGridClass = compact
    ? 'grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_320px]'
    : embedded
      ? 'grid min-h-[720px]'
      : 'grid lg:grid-cols-[minmax(0,1fr)_320px] min-h-[720px]';

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= frames.length - 1) { setPlaying(false); return value; }
        return value + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, frames.length]);

  useEffect(() => { setStep(0); setPlaying(false); }, [problemId, pattern]);

  useEffect(() => {
    setStep((value) => Math.min(value, Math.max(frames.length - 1, 0)));
  }, [frames.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setPlaying((value) => !value);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlaying(false);
        setStep((value) => Math.min(frames.length - 1, value + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlaying(false);
        setStep((value) => Math.max(0, value - 1));
      } else if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        e.preventDefault();
        setPlaying(false);
        setStep(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frames.length]);

  const copyCode = async () => {
    const text = code.join('\n');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div tabIndex={0} className={`${compact ? 'h-full min-h-0' : 'min-h-[640px]'} bg-[#08080a] text-slate-200 border border-white/10 hover:border-amber-400/30 transition-all rounded-xl overflow-hidden font-mono shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50`}>
      <div className={shellGridClass}>
        <section className={`${compact ? 'h-full min-h-0' : ''} flex flex-col min-w-0 bg-slate-950/90`}>
          <header className={`${compact ? 'px-4 py-2' : 'px-5 sm:px-8 pt-5 pb-3'} flex items-start justify-between gap-4 border-b border-slate-800/60 bg-slate-900/40`}>
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-bold">{mode}</div>
              <h2 className={`font-sans font-bold tracking-tight text-white mt-0.5 ${compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>{problemTitle}</h2>
              <div className={`${compact ? 'mt-1 px-2 py-0.5 text-[10px]' : 'mt-3 px-3 py-1.5 text-xs'} inline-flex items-center gap-2 border border-white/10 rounded-lg text-slate-300`}>{patternNames[pattern] || 'Algorithm'} <span className="text-amber-400 font-semibold">{isVerified ? 'verified' : 'live'}</span></div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setMode('concept')} className={mode === 'concept' ? 'px-3 py-1.5 rounded-lg bg-amber-400 text-[#08080a] font-bold text-xs shadow-md shadow-amber-400/20 transition-all' : 'px-3 py-1.5 rounded-lg bg-[#111115] hover:bg-[#18181d] text-slate-200 border border-white/10 font-semibold text-xs transition-all'}>Concept</button>
              <button type="button" onClick={() => setMode('practice')} className={mode === 'practice' ? 'px-3 py-1.5 rounded-lg bg-amber-400 text-[#08080a] font-bold text-xs shadow-md shadow-amber-400/20 transition-all' : 'px-3 py-1.5 rounded-lg bg-[#111115] hover:bg-[#18181d] text-slate-200 border border-white/10 font-semibold text-xs transition-all'}>Practice</button>
            </div>
          </header>

          <div className={`${compact ? 'px-4 my-1.5' : 'px-5 sm:px-8 my-3'} flex items-center justify-between text-[11px] text-slate-400`}><span>{patternNames[pattern] || 'Algorithm'} walk</span><span>step {boundedStep + 1} / {frames.length}</span></div>

          <div className={`${compact ? 'px-4 pb-2' : 'px-5 sm:px-8 pb-4'}`}>
            <div className={`${compact ? 'grid-cols-4 lg:grid-cols-8 gap-1.5' : 'grid-cols-2 md:grid-cols-4 gap-2'} grid`}>
              {frames.map((item, index) => {
                const phase = stateValue(item, 'phase') || `Step ${index + 1}`;
                const selected = index === boundedStep;
                return (
                  <button
                    key={`${phase}-${index}`}
                    type="button"
                    aria-current={selected ? 'step' : undefined}
                    onClick={() => { setPlaying(false); setStep(index); }}
                    className={`${compact ? 'min-h-[42px] rounded-lg px-2 py-1.5' : 'min-h-[58px] rounded-xl px-3 py-2'} border text-left transition-all ${
                      selected
                        ? 'border-amber-400/60 bg-amber-400/10 shadow-sm shadow-amber-400/10'
                        : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span className={`block text-[10px] font-mono uppercase tracking-[0.16em] ${selected ? 'text-amber-300' : 'text-slate-500'}`}>0{index + 1}</span>
                    <span className={`mt-1 block font-sans text-xs font-semibold leading-snug ${selected ? 'text-slate-100' : 'text-slate-300'}`}>{phase}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${compact ? 'px-4 flex-1 min-h-0 space-y-2' : 'px-5 sm:px-8 flex-1 space-y-5'}`}>
            <div className={`${compact ? 'h-full min-h-[220px] p-2' : 'min-h-[380px] sm:min-h-[460px] p-3 sm:p-6'} flex items-center justify-center border border-white/10 overflow-hidden bg-[#0c0c0f] rounded-xl`}>
              <AnimatePresence mode="popLayout">
                <VisualizerScene frame={current} step={boundedStep} compact={compact} />
              </AnimatePresence>
            </div>

            <div className={`${compact ? 'hidden' : 'grid'} lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)] gap-5 items-start`}>
              <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/90 shadow-inner">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#111115]"><span className="font-sans font-bold text-xs uppercase tracking-wider text-slate-200">{mode === 'concept' ? 'Concept Pseudocode' : 'Practice Pseudocode'}</span><button type="button" onClick={copyCode} title="Copy pseudocode" className="px-2.5 py-1 border border-white/10 rounded-lg bg-[#18181d] text-xs text-slate-200 flex items-center gap-1.5 hover:border-amber-400/50 hover:text-amber-300 transition-all"><Copy className="w-3.5 h-3.5" /> {copied ? 'copied' : 'copy'}</button></div>
                <div className="p-3.5 space-y-1.5 text-xs leading-relaxed bg-[#08080a]">{code.map((line, index) => <div key={`${line}-${index}`} className={`flex gap-3 px-2.5 py-1 rounded-md transition-all ${current.codeLine === index + 1 ? 'bg-amber-400/10 border-l-2 border-amber-400 text-amber-200 font-medium' : 'text-slate-400'}`}><span className="w-5 text-right text-slate-500 shrink-0 select-none">{index + 1}</span><code className="font-mono">{line}</code></div>)}</div>
              </div>
              <div className="border border-slate-800/80 rounded-xl p-3.5 grid grid-cols-2 gap-2.5 bg-slate-900/70 min-h-[80px]">
                {current.state.map((item, idx) => (
                  <div key={`${item.label}-${item.value}`} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-bold">{item.label}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">state</span>
                    </div>
                    <div className="font-mono font-semibold text-sm text-amber-300 mt-1 break-words">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${compact ? 'px-4 mt-2' : 'px-5 sm:px-8 mt-6'}`}>
            <div className={`${compact ? 'p-2.5 min-h-[58px]' : 'p-4 min-h-[88px]'} border border-slate-800/80 rounded-xl bg-slate-900/70 flex flex-col justify-between gap-2 transition-all`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Commentary</span>
                </div>
                <span className="text-[10px] font-mono font-medium tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  Commentary • Step {boundedStep + 1} of {frames.length}
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={frameKey}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`${compact ? 'line-clamp-1 text-xs' : 'text-sm'} font-sans leading-relaxed text-slate-200`}
                >
                  {current.commentary}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className={`${compact ? 'hidden' : embedded ? '' : 'lg:hidden'} px-5 sm:px-8 mt-5`}>
            <div className="h-[520px] overflow-hidden rounded-xl border border-slate-800/80">
              <VisualizerTutor currentFrame={current} problemTitle={problemTitle} step={boundedStep} totalSteps={frames.length} frameKey={frameKey} />
            </div>
          </div>

          <footer className={`${compact ? 'px-4 py-2 mt-2' : 'px-5 sm:px-8 py-4 mt-4'} flex flex-wrap items-center gap-3 border-t border-slate-800/80 bg-slate-900/60 font-sans`}>
            <button type="button" aria-label="Reset visualization" title="Reset" onClick={() => { setStep(0); setPlaying(false); }} className="p-2.5 border border-white/10 rounded-lg bg-[#111115] text-slate-200 hover:border-amber-400/50 hover:text-amber-300 hover:shadow-sm hover:shadow-amber-400/20 transition-all"><RotateCcw className="w-4 h-4" /></button>
            <button type="button" aria-label="Previous visualization step" title="Previous step" disabled={boundedStep === 0} onClick={() => { setPlaying(false); setStep((value) => Math.max(0, value - 1)); }} className="p-2.5 border border-white/10 rounded-lg bg-[#111115] text-slate-200 disabled:opacity-40 hover:enabled:border-amber-400/50 hover:enabled:text-amber-300 hover:enabled:shadow-sm hover:enabled:shadow-amber-400/20 transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" onClick={() => setPlaying((value) => !value)} className={`px-5 py-2.5 rounded-lg font-sans font-bold text-xs flex items-center gap-2 transition-all ${playing ? 'bg-amber-300 text-[#08080a] shadow-lg shadow-amber-400/30 ring-2 ring-amber-400/50' : 'bg-amber-400 text-[#08080a] shadow-lg shadow-amber-400/20 hover:bg-amber-300'}`}>{playing ? <Pause className="w-4 h-4 fill-[#08080a]" /> : <Play className="w-4 h-4 fill-[#08080a]" />} {playing ? 'Pause' : 'Play'}</button>
            <button type="button" aria-label="Next visualization step" title="Next step" disabled={boundedStep === frames.length - 1} onClick={() => { setPlaying(false); setStep((value) => Math.min(frames.length - 1, value + 1)); }} className="p-2.5 border border-white/10 rounded-lg bg-[#111115] text-slate-200 disabled:opacity-40 hover:enabled:border-amber-400/50 hover:enabled:text-amber-300 hover:enabled:shadow-sm hover:enabled:shadow-amber-400/20 transition-all"><ChevronRight className="w-4 h-4" /></button>
            <input aria-label="Lesson progress" type="range" min="0" max={frames.length - 1} value={boundedStep} onChange={(event) => { setPlaying(false); setStep(Number(event.target.value)); }} className="flex-1 min-w-[120px] accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer" />
            <select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="bg-[#111115] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 hover:border-amber-400/50 transition-all"><option value="1800">0.5x</option><option value="1200">1x</option><option value="700">2x</option></select>
            <span className="text-[10px] text-slate-400 w-10 text-right font-mono">{Math.round(progress)}%</span>
          </footer>
        </section>

        {/* Tutor sidebar */}
        <aside className={`${embedded ? 'hidden' : 'hidden lg:block'} min-h-0 border-l border-slate-800/80`}>
          <VisualizerTutor currentFrame={current} problemTitle={problemTitle} step={boundedStep} totalSteps={frames.length} frameKey={frameKey} />
        </aside>
      </div>
    </div>
  );
};
