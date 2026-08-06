import fs from 'node:fs';

const visualizerPath = 'components/problems/ProblemVisualizer.tsx';
const scenePath = 'components/problems/VisualizerScene.tsx';
const libraryPath = 'app/visualizer/page.tsx';
const visualizer = fs.readFileSync(visualizerPath, 'utf8');
const scene = fs.readFileSync(scenePath, 'utf8');
const library = fs.readFileSync(libraryPath, 'utf8');
const tutor = fs.readFileSync('components/problems/VisualizerTutor.tsx', 'utf8');
const visualizerRoute = fs.readFileSync('app/api/ai/visualizer/route.ts', 'utf8');

const requiredVisualizerMarkers = [
  'compact?: boolean',
  'h-full min-h-0',
  'min-h-[380px] sm:min-h-[460px]',
  'compact={compact}',
  'lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]',
];

for (const marker of requiredVisualizerMarkers) {
  if (!visualizer.includes(marker)) {
    throw new Error(`Visualizer layout contract missing: ${marker}`);
  }
}

if (visualizer.includes('xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]')) {
  throw new Error('Visualizer scene must not share its primary row with the support panels.');
}

if (!scene.includes('min-h-[360px]')) {
  throw new Error('Visualizer scene must retain a stable minimum render height.');
}

if (!scene.includes("compact ? 'h-full max-h-full w-full overflow-visible'") || !scene.includes("className={compact ? 'h-full w-full' : 'w-full'}")) {
  throw new Error('Visualizer scene must support compact viewport scaling.');
}

if (!library.includes('h-[calc(100svh-56px)] overflow-hidden') || !library.includes('compact />')) {
  throw new Error('Visualizer library must render the compact visualizer in a viewport-locked shell.');
}

if (scene.includes('animate={{ y, height') || scene.includes('animate={{ y: y')) {
  throw new Error('Bar rectangles must not animate SVG y through Framer Motion; it double-applies browser transforms.');
}

if (!scene.includes('React.useId()') || !scene.includes('scene-arrow-${reactId}')) {
  throw new Error('Node/graph SVG marker ids must be scoped per scene instance.');
}

if (!scene.includes('function graphPositions') || scene.includes('|| [340, 150]')) {
  throw new Error('Graph scene must compute fallback positions instead of overlapping extra nodes at the center.');
}

if (!scene.includes('bitFontSize') || !scene.includes('indexFontSize')) {
  throw new Error('Bits scene must scale text for longer bit strings.');
}

if (!library.includes('titleFromPath(selected.lessonPath)')) {
  throw new Error('Visualizer workspace links must fall back to the canonical lesson slug.');
}

if (!tutor.includes('new AbortController()') || !tutor.includes('15_000')) {
  throw new Error('Visualizer tutor must bound client-side provider requests.');
}

if (!visualizerRoute.includes('timeoutMs: 12_000') || !visualizerRoute.includes('fallbackText:')) {
  throw new Error('Visualizer API must provide bounded provider fallback behavior.');
}

console.log('Visualizer layout verification: full-width scene and stable render height are preserved.');
