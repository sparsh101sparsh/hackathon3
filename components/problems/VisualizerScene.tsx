'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface VisualizerSceneFrame {
  visualType: 'array' | 'matrix' | 'stack' | 'nodes' | 'graph' | 'bars' | 'bits';
  values?: (string | number)[];
  matrix?: (string | number)[][];
  stack?: (string | number)[];
  nodes?: string[];
  edges?: [number, number][];
  active?: number[];
  pointers?: Record<string, number>;
  bars?: number[];
  bits?: string;
}

type SceneProps = {
  frame: VisualizerSceneFrame;
  step: number;
  markerIds?: MarkerIds;
  compact?: boolean;
};

type MarkerIds = {
  arrow: string;
  activeArrow: string;
};

export const SCENE_THEME = {
  active: {
    fill: '#92400e',
    fillGradient: '#b45309',
    stroke: '#fbbf24',
    shadow: 'rgba(251, 191, 36, 0.2)',
    text: '#fcd34d',
  },
  visited: {
    fill: '#57534e',
    fillGradient: '#78716c',
    stroke: '#d6d3d1',
    shadow: 'rgba(214, 211, 209, 0.16)',
    text: '#e7e5e4',
  },
  default: {
    fill: '#111115',
    stroke: '#3f3f46',
    text: '#f8fafc',
  },
  text: {
    slate100: '#f8fafc',
    amber300: '#fcd34d',
    emerald300: '#d6d3d1',
    muted: '#a8a29e',
  },
  background: '#08080a',
} as const;

const ink = SCENE_THEME.text.slate100;
const muted = SCENE_THEME.text.muted;
const line = SCENE_THEME.default.stroke;
const accent = SCENE_THEME.active.stroke;
const accentSoft = SCENE_THEME.active.fillGradient;
const amber = SCENE_THEME.visited.stroke;

const ease = [0.22, 1, 0.36, 1] as const;
const cellTransition = { duration: 0.42, ease };

const springs = {
  array: { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 },
  pointers: { type: 'spring', stiffness: 220, damping: 20, mass: 0.6 },
  matrix: { type: 'spring', stiffness: 260, damping: 22, mass: 0.7 },
  pulse: { type: 'spring', stiffness: 380, damping: 24, mass: 0.5 },
  stackPush: { type: 'spring', stiffness: 420, damping: 26, mass: 0.9 },
  stackPop: { type: 'spring', stiffness: 320, damping: 28 },
  nodes: { type: 'spring', stiffness: 210, damping: 21, mass: 0.85 },
  edge: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] },
  bars: { type: 'spring', stiffness: 280, damping: 24, mass: 0.7 },
  bitsFlip: { type: 'spring', stiffness: 480, damping: 26, mass: 0.4 },
  bitsShift: { type: 'spring', stiffness: 240, damping: 22, mass: 0.6 },
};

function SceneFrame({ children, markerIds, compact = false }: { children: React.ReactNode; markerIds?: MarkerIds; compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 680 360"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Animated algorithm state"
      className={compact ? 'h-full max-h-full w-full overflow-visible' : 'w-full h-auto min-h-[360px] max-h-[520px] overflow-visible'}
    >
      {markerIds && (
        <defs>
          <marker id={markerIds.arrow} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill={muted} />
          </marker>
          <marker id={markerIds.activeArrow} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill={accent} />
          </marker>
        </defs>
      )}
      <rect x="0" y="0" width="680" height="360" rx="12" fill={SCENE_THEME.background} />
      {children}
    </svg>
  );
}

function Label({ x, y, children, fill = muted, size = 12, anchor = 'middle' as const }: { x: number; y: number; children: React.ReactNode; fill?: string; size?: number; anchor?: 'start' | 'middle' | 'end' }) {
  return <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">{children}</text>;
}

function ArrayScene({ frame, compact }: SceneProps) {
  const values = frame.values || [];
  const cellWidth = Math.min(84, 560 / Math.max(values.length, 1));
  const boxSize = cellWidth - 12;
  const total = cellWidth * values.length;
  const startX = (680 - total) / 2;
  const active = new Set(frame.active || []);
  const pointerEntries = Object.entries(frame.pointers || {});

  return (
    <SceneFrame compact={compact}>
      <g>
        {values.map((value, index) => {
          const x = startX + index * cellWidth + 6;
          const isActive = active.has(index);
          const yOffset = 0;
          return (
            <motion.g key={`arr-elem-${index}`} initial={false} animate={{ x, y: yOffset }} transition={springs.array} style={{ transformOrigin: `${boxSize / 2}px 145px` }}>
              <motion.rect x={0} y={100 + 4} width={boxSize} height={boxSize} rx="8" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.pulse} />
              <motion.rect x={0} y={100} width={boxSize} height={boxSize} rx="8" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.pulse} />
              <text x={boxSize / 2} y={100 + boxSize / 2 + 10} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={28} fontWeight="900" fontFamily="sans-serif">{value}</text>
              <Label x={boxSize / 2} y={100 + boxSize + 22} size={11}>[{index}]</Label>
            </motion.g>
          );
        })}
        {pointerEntries.map(([name, index], pointerIndex) => {
          const x = startX + index * cellWidth + cellWidth / 2;
          const color = pointerIndex % 2 === 0 ? SCENE_THEME.active.stroke : SCENE_THEME.visited.stroke;
          return (
            <motion.g key={`ptr-${name}`} initial={false} animate={{ x }} transition={springs.pointers}>
              <text x={0} y={230} textAnchor="middle" fill={color} fontSize={18} fontWeight="900" fontFamily="sans-serif">{name}</text>
              <path d="M -4 245 L 4 245 L 0 237 Z" fill={color} />
            </motion.g>
          );
        })}
      </g>
    </SceneFrame>
  );
}

function MatrixScene({ frame, compact }: SceneProps) {
  const matrix = frame.matrix || [[]];
  const rows = matrix.length;
  const cols = Math.max(...matrix.map((row) => row.length), 1);
  const size = Math.min(72, 340 / Math.max(rows, cols));
  const left = 340 - (cols * size) / 2;
  const top = 170 - (rows * size) / 2;
  const active = new Set(frame.active || []);
  return (
    <SceneFrame compact={compact}>
      <g>
        {matrix.flatMap((row, rowIndex) => row.map((value, colIndex) => {
          const index = rowIndex * cols + colIndex;
          const x = left + colIndex * size;
          const y = top + rowIndex * size;
          const isActive = active.has(index);
          const boxSize = size - 6;
          return (
            <motion.g key={`mat-${index}`} initial={false} animate={{ x, y }} transition={springs.matrix}>
              <motion.rect x={3} y={3 + 4} width={boxSize} height={boxSize} rx="6" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.pulse} />
              <motion.rect x={3} y={3} width={boxSize} height={boxSize} rx="6" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.pulse} />
              <text x={3 + boxSize / 2} y={3 + boxSize / 2 + 5} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={size > 40 ? 18 : 14} fontWeight="900" fontFamily="sans-serif">{value}</text>
            </motion.g>
          );
        }))}
        <Label x={340} y={330} fill={SCENE_THEME.text.muted} size={11}>{rows} x {cols} STATE MATRIX</Label>
      </g>
    </SceneFrame>
  );
}

function StackScene({ frame, compact }: SceneProps) {
  const stack = frame.stack || [];
  return (
    <SceneFrame compact={compact}>
      <g>
        <motion.line x1="230" y1="248" x2="450" y2="248" stroke={SCENE_THEME.default.stroke} strokeWidth="4" />
        <AnimatePresence>
          {stack.map((value, index) => {
            const y = 226 - index * 48;
            const isActive = index === stack.length - 1;
            return (
              <motion.g key={`stack-item-${index}`} initial={{ opacity: 0, y: y + 24, scale: 0.85 }} animate={{ opacity: 1, y, scale: 1 }} exit={{ opacity: 0, y: y - 40, scale: 0.8 }} transition={springs.stackPush}>
                <motion.rect x="270" y={-38 + 4} width="140" height="40" rx="8" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.pulse} />
                <motion.rect x="270" y={-38} width="140" height="40" rx="8" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.pulse} />
                <text x={340} y={-12} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={18} fontWeight="900" fontFamily="sans-serif">{value}</text>
              </motion.g>
            );
          })}
        </AnimatePresence>
        <Label x={340} y={270} fill={SCENE_THEME.text.muted} size={11}>STACK BOTTOM</Label>
        {stack.length > 0 && <Label x={340} y={48} fill={SCENE_THEME.active.stroke} size={11}>TOP</Label>}
      </g>
    </SceneFrame>
  );
}

function NodeScene({ frame, markerIds, compact }: SceneProps) {
  const nodes = frame.nodes || [];
  const active = new Set(frame.active || []);
  const gap = Math.min(104, 560 / Math.max(nodes.length, 1));
  const startX = 340 - ((nodes.length - 1) * gap) / 2;
  const arrowId = markerIds?.arrow || 'scene-arrow';
  const activeArrowId = markerIds?.activeArrow || 'scene-arrow-active';
  return (
    <SceneFrame markerIds={markerIds} compact={compact}>
      <g>
        {nodes.slice(0, -1).map((_, index) => <motion.line key={`edge-${index}`} x1={startX + index * gap + 31} y1="150" x2={startX + (index + 1) * gap - 31} y2="150" stroke={active.has(index) ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="4" markerEnd={active.has(index) ? `url(#${activeArrowId})` : `url(#${arrowId})`} animate={{ stroke: active.has(index) ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.edge} />)}
        {nodes.map((node, index) => {
          const x = startX + index * gap;
          const isActive = active.has(index);
          return (
            <motion.g key={`node-${index}`} initial={false} animate={{ x }} transition={springs.nodes}>
              <motion.circle cx={0} cy={150 + 4} r="31" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.pulse} />
              <motion.circle cx={0} cy={150} r="31" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.pulse} />
              <text x={0} y={150 + 5} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={node.length > 5 ? 12 : 18} fontWeight="900" fontFamily="sans-serif">{node}</text>
            </motion.g>
          );
        })}
      </g>
    </SceneFrame>
  );
}

function graphPositions(count: number) {
  const fixed = [[150, 150], [310, 78], [310, 222], [510, 78], [510, 222]];
  if (count <= fixed.length) return fixed.slice(0, count);

  const radius = 118;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return [
      340 + Math.cos(angle) * radius,
      170 + Math.sin(angle) * radius,
    ];
  });
}

function GraphScene({ frame, markerIds, compact }: SceneProps) {
  const nodes = frame.nodes || [];
  const active = new Set(frame.active || []);
  const positions = graphPositions(nodes.length);
  const arrowId = markerIds?.arrow || 'scene-arrow';
  const activeArrowId = markerIds?.activeArrow || 'scene-arrow-active';
  return (
    <SceneFrame markerIds={markerIds} compact={compact}>
      <g>
        {(frame.edges || []).map(([from, to], index) => {
          const [x1, y1] = positions[from] || positions[0];
          const [x2, y2] = positions[to] || positions[0];
          const edgeActive = active.has(from) && (active.has(to) || index < active.size);
          return <motion.line key={`${from}-${to}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={edgeActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth={edgeActive ? 4 : 3} markerEnd={edgeActive ? `url(#${activeArrowId})` : `url(#${arrowId})`} animate={{ stroke: edgeActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.edge} />;
        })}
        {nodes.map((node, index) => {
          const [x, y] = positions[index];
          const isActive = active.has(index);
          return (
            <motion.g key={`graph-node-${index}`} initial={false} animate={{ x, y }} transition={springs.nodes}>
              <motion.circle cx={0} cy={4} r="32" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.pulse} />
              <motion.circle cx={0} cy={0} r="32" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.pulse} />
              <text x={0} y={6} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={18} fontWeight="900" fontFamily="sans-serif">{node}</text>
            </motion.g>
          );
        })}
      </g>
    </SceneFrame>
  );
}

function BarsScene({ frame, compact }: SceneProps) {
  const bars = frame.bars || [];
  const active = new Set(frame.active || []);
  const width = Math.min(54, 520 / Math.max(bars.length, 1));
  const startX = 340 - (bars.length * width) / 2;
  const hasNegative = bars.some((value) => value < 0);
  const positiveMax = Math.max(...bars.filter((value) => value > 0), 1);
  const negativeMax = Math.max(...bars.filter((value) => value < 0).map((value) => Math.abs(value)), 1);
  const baseline = hasNegative ? 218 : 268;
  const positivePlotHeight = hasNegative ? 128 : 168;
  const negativePlotHeight = hasNegative ? 76 : 0;
  const indexY = hasNegative ? baseline + negativePlotHeight + 28 : baseline + 22;
  return (
    <SceneFrame compact={compact}>
      <g>
        <line x1="70" y1={baseline} x2="610" y2={baseline} stroke={SCENE_THEME.default.stroke} strokeWidth="4" />
        <Label x={610} y={baseline - 12} anchor="end" fill={SCENE_THEME.text.muted} size={10}>VALUE SCALE</Label>
        {bars.map((value, index) => {
          const valueMagnitude = Math.abs(value);
          const max = value < 0 ? negativeMax : positiveMax;
          const scaled = valueMagnitude === 0 ? 0 : Math.sqrt(valueMagnitude / max);
          const height = valueMagnitude === 0 ? 4 : Math.max(scaled * (value < 0 ? negativePlotHeight : positivePlotHeight), 12);
          const x = startX + index * width + 4;
          const y = value < 0 ? baseline + 4 : baseline - height;
          const isActive = active.has(index);
          const boxWidth = width - 8;
          const labelSize = String(value).length > 3 ? 10 : 12;
          const valueLabelY = value < 0 ? y + height + 14 : Math.max(34, y - 8);
          return (
            <motion.g key={`bar-${index}`} initial={false} animate={{ x }} transition={springs.bars}>
              <motion.rect x={3} y={3} width={boxWidth} rx="4" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ y, height, fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.bars} />
              <motion.rect x={0} y={0} width={boxWidth} rx="4" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ y, height, fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={springs.bars} />
              <motion.text x={boxWidth / 2} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={labelSize} fontWeight="900" fontFamily="sans-serif" animate={{ y: valueLabelY, fill: isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100 }} transition={springs.bars}>{value}</motion.text>
              <text x={boxWidth / 2} y={indexY} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={12} fontWeight="900" fontFamily="sans-serif">{index}</text>
            </motion.g>
          );
        })}
      </g>
    </SceneFrame>
  );
}

function BitsScene({ frame, compact }: SceneProps) {
  const bits = frame.bits || '';
  const cellWidth = Math.min(64, 560 / Math.max(bits.length, 1));
  const boxSize = cellWidth - 8;
  const total = cellWidth * bits.length;
  const startX = (680 - total) / 2;
  const active = new Set(frame.active || []);
  const bitFontSize = Math.max(8, Math.min(24, boxSize * 0.68));
  const indexFontSize = bits.length > 16 ? 7 : 11;

  return (
    <SceneFrame compact={compact}>
      <g>
        {bits.split('').map((bit, index) => {
          const x = startX + index * cellWidth + 4;
          const isActive = bit === '1' || active.has(index);
          const shouldFlip = bit === '1';
          return (
            <motion.g key={`bit-slot-${index}`} initial={false} animate={{ x }} transition={springs.bitsShift} style={{ transformOrigin: `${boxSize / 2}px 145px` }}>
              <motion.rect x={0} y={100 + 4} width={boxSize} height={boxSize} rx="8" fill={isActive ? SCENE_THEME.active.fill : 'transparent'} animate={{ fill: isActive ? SCENE_THEME.active.fill : 'transparent' }} transition={springs.pulse} />
              <motion.rect x={0} y={100} width={boxSize} height={boxSize} rx="8" fill={isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill} stroke={isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke} strokeWidth="2" animate={{ rotateX: shouldFlip ? [0, 90, 0] : 0, scale: shouldFlip ? [1, 1.12, 1] : 1, fill: isActive ? SCENE_THEME.active.fillGradient : SCENE_THEME.default.fill, stroke: isActive ? SCENE_THEME.active.stroke : SCENE_THEME.default.stroke }} transition={shouldFlip ? springs.bitsFlip : springs.pulse} />
              <motion.text x={boxSize / 2} y={100 + boxSize / 2 + bitFontSize / 3} textAnchor="middle" fill={isActive ? SCENE_THEME.text.amber300 : SCENE_THEME.text.slate100} fontSize={bitFontSize} fontWeight="900" fontFamily="sans-serif" animate={{ rotateX: shouldFlip ? [0, 90, 0] : 0 }} transition={shouldFlip ? springs.bitsFlip : springs.pulse}>{bit}</motion.text>
              <Label x={boxSize / 2} y={100 + boxSize + 18} size={indexFontSize}>{bits.length - index - 1}</Label>
            </motion.g>
          );
        })}
      </g>
    </SceneFrame>
  );
}

export function VisualizerScene({ frame, step, compact }: SceneProps) {
  const key = `${frame.visualType}`;
  const reactId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const markerIds = { arrow: `scene-arrow-${reactId}`, activeArrow: `scene-arrow-active-${reactId}` };
  return (
    <motion.div key={key} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.24 }} className={compact ? 'h-full w-full' : 'w-full'}>
      {frame.visualType === 'array' && <ArrayScene frame={frame} step={step} compact={compact} />}
      {frame.visualType === 'matrix' && <MatrixScene frame={frame} step={step} compact={compact} />}
      {frame.visualType === 'stack' && <StackScene frame={frame} step={step} compact={compact} />}
      {frame.visualType === 'nodes' && <NodeScene frame={frame} step={step} markerIds={markerIds} compact={compact} />}
      {frame.visualType === 'graph' && <GraphScene frame={frame} step={step} markerIds={markerIds} compact={compact} />}
      {frame.visualType === 'bars' && <BarsScene frame={frame} step={step} compact={compact} />}
      {frame.visualType === 'bits' && <BitsScene frame={frame} step={step} compact={compact} />}
    </motion.div>
  );
}
