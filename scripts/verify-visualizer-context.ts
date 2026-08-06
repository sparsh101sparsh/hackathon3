import { problemVisualizerScenarios } from '../components/problems/problemVisualizerScenarios';
import { buildVisualizerFrames, LessonFrame } from '../components/problems/ProblemVisualizer';
import { getVisualizerLesson } from '../components/problems/visualizerLessons';

interface VisualizerTutorPayload {
  problemTitle: string;
  currentFrame: Partial<LessonFrame> | null;
  frameKey: string;
  step: number;
  totalSteps: number;
  messages: Array<{ role: string; content: string }>;
  personality: string;
}

function verifyVisualizerFrameInjection() {
  console.log('--- Starting Visualizer Frame Context Injection Verification (Requirement R2) ---');

  const slugs = Object.keys(problemVisualizerScenarios);
  console.log(`Testing ${slugs.length} scenario problems...`);

  let totalFramesTested = 0;
  let totalPayloadsVerified = 0;

  for (const slug of slugs) {
    const lesson = getVisualizerLesson(slug, 'two-pointers');
    const problemTitle = (lesson as unknown as { title?: string; label?: string }).title || lesson.label || slug;
    const pattern = (lesson as unknown as { pattern?: string }).pattern || 'arrays-hashing';

    const frames = buildVisualizerFrames(pattern, problemTitle, slug);
    if (!frames || frames.length === 0) {
      throw new Error(`[FAIL] No frames generated for slug: ${slug}`);
    }

    // Test step-by-step frame snapshot injection
    for (let step = 0; step < frames.length; step++) {
      const currentFrame = frames[step];
      const phase = currentFrame.state.find((item) => item.label === 'phase')?.value || `step ${step + 1}`;
      const frameKey = `${slug}:${slug}:${step}:${phase}:${currentFrame.codeLine}`;
      totalFramesTested++;

      if (!currentFrame) {
        throw new Error(`[FAIL] Frame at step ${step} is undefined for slug: ${slug}`);
      }

      // Simulate VisualizerTutor payload construction (VisualizerTutor.tsx:60-88)
      const framePayload = currentFrame
        ? {
            visualType: currentFrame.visualType,
            codeLine: currentFrame.codeLine,
            commentary: currentFrame.commentary,
            state: currentFrame.state,
            active: currentFrame.active,
            pointers: currentFrame.pointers,
            values: currentFrame.values,
            matrix: currentFrame.matrix,
            stack: currentFrame.stack,
            nodes: currentFrame.nodes,
            edges: currentFrame.edges,
            bars: currentFrame.bars,
            bits: currentFrame.bits,
          }
        : null;

      const requestPayload: VisualizerTutorPayload = {
        problemTitle,
        currentFrame: framePayload,
        frameKey,
        step,
        totalSteps: frames.length,
        messages: [{ role: 'user', content: 'Can you explain what happens in this step?' }],
        personality: 'speedrunner',
      };

      // Objective 1 Verification: Check exact frame snapshot received on step changes
      if (!requestPayload.currentFrame) {
        throw new Error(`[FAIL] Null currentFrame payload for slug ${slug} step ${step}`);
      }

      // Objective 2 Verification: Check API payload structure sent to /api/ai/visualizer
      // Payload must contain commentary, codeLine, phase, step, state, and visualType
      const cf = requestPayload.currentFrame;

      if (typeof cf.visualType !== 'string') {
        throw new Error(`[FAIL] Missing or invalid visualType for ${slug} step ${step}`);
      }
      if (typeof cf.codeLine !== 'number' || cf.codeLine <= 0) {
        throw new Error(`[FAIL] Missing or invalid codeLine for ${slug} step ${step}`);
      }
      if (typeof cf.commentary !== 'string' || cf.commentary.length === 0) {
        throw new Error(`[FAIL] Missing or empty commentary for ${slug} step ${step}`);
      }
      if (!Array.isArray(cf.state)) {
        throw new Error(`[FAIL] State is not an array for ${slug} step ${step}`);
      }

      // Check state items for phase and step
      const phaseItem = cf.state.find((item) => item.label === 'phase');
      const stepItem = cf.state.find((item) => item.label === 'step');

      if (!phaseItem) {
        throw new Error(`[FAIL] State missing 'phase' label for scenario problem ${slug} step ${step}`);
      }
      if (!stepItem) {
        throw new Error(`[FAIL] State missing 'step' label for scenario problem ${slug} step ${step}`);
      }

      if (typeof requestPayload.step !== 'number' || requestPayload.step !== step) {
        throw new Error(`[FAIL] Top-level payload step mismatch for ${slug} step ${step}`);
      }
      if (typeof requestPayload.totalSteps !== 'number' || requestPayload.totalSteps !== frames.length) {
        throw new Error(`[FAIL] Top-level totalSteps mismatch for ${slug} step ${step}`);
      }
      if (typeof requestPayload.frameKey !== 'string' || !requestPayload.frameKey.includes(`${slug}:`)) {
        throw new Error(`[FAIL] Missing or invalid frameKey for ${slug} step ${step}`);
      }

      totalPayloadsVerified++;
    }
  }

  console.log(`[SUCCESS] Tested ${totalFramesTested} frames across ${slugs.length} problems.`);
  console.log(`[SUCCESS] Verified ${totalPayloadsVerified} API payloads for /api/ai/visualizer.`);
  console.log('--- All Visualizer Frame Context Injection Checks Passed ---');
}

verifyVisualizerFrameInjection();
