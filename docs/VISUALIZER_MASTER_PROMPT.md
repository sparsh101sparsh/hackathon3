# Visualizer Expansion Master Prompt

Use this prompt when asking an AI coding agent to rebuild the algorithm visualizer lessons into richer, verified, step-by-step experiences.

```text
You are working in the CodeForge Next.js repository. Your goal is to upgrade the problem visualizer lessons so they are detailed, mechanically correct, and fully synced with the AI guide/commentary experience.

Current problem:
- Many visualizer lessons are only 4 or 5 steps.
- Several steps are too generic and do not show the actual algorithm state clearly.
- The on-screen commentary and the AI visualizer guide must describe the same frame state.
- The visualizer must remain renderable by the existing React/SVG renderer.

Primary files to inspect first:
- components/problems/ProblemVisualizer.tsx
- components/problems/VisualizerScene.tsx
- components/problems/VisualizerTutor.tsx
- components/problems/problemVisualizerScenarios.ts
- components/problems/visualizerLessons.ts
- public/data/visualizers.json
- scripts/verify-visualizers.ts
- scripts/verify-frame-rendering.ts
- scripts/verify-visualizer-context.ts
- scripts/test-visualizer-layout.ts

Deliverables:
1. Expand every mapped visualizer lesson to 8-12 meaningful frames.
2. Every frame must be problem-specific, not pattern-generic filler.
3. Every frame must include valid visual state that the renderer can draw.
4. Every frame's commentary must match the visual payload exactly.
5. The VisualizerTutor AI request must stay synced to the exact selected frame.
6. Verification scripts must fail if a future scenario regresses to shallow or malformed steps.

Required frame model:
Each generated frame must conform to the existing LessonFrame shape:

type LessonFrame = {
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
  codeLine: number;
  commentary: string;
  state: { label: string; value: string }[];
};

Frame quality rules:
- Use 8-12 frames per visualizer. Minimum acceptable count is 8.
- Each frame needs a unique phase label and unique commentary.
- Each commentary should be 1-2 precise sentences, 70-180 characters preferred.
- Do not say "we process the next item" unless the frame identifies which item, index, node, cell, value, or pointer is active.
- Each frame must include at least three useful state chips where possible, such as index, left/right, mid, current, target, sum, best, stack top, queue, visited, carry, dp value, remaining, or answer.
- First frame must expose input state. Last frame must expose output state.
- `codeLine` must be between 1 and the lesson profile code length.
- Use the same sample input/output described in `visualizerLessons.ts`.
- Make active indices valid for the visual type:
  - array/bars: active indices are positions in `values` or `bars`.
  - matrix: active indices are flattened row-major positions.
  - stack: top is represented by the last element in `stack`.
  - nodes/graph: active indices are positions in `nodes`.
  - bits: include the exact bit string in `bits`; use state chips for mask, carry, count, or answer.

Renderer constraints:
- Do not introduce a new visual type unless you also update `VisualizerScene.tsx`, tests, and all schema checks.
- Keep arrays and bars small enough to fit: prefer 5-10 elements.
- Keep matrix dimensions small enough to fit: prefer 3x3, 3x4, 4x4, or 4x5.
- Keep graph/node labels short. Prefer single letters, numbers, or compact semantic labels.
- Pointers must point to valid array indices. Avoid negative pointer positions in rendered frames.
- Edges must reference valid node indices.

Scenario implementation guidance:
- Replace the fixed 4-step scenario contract in `problemVisualizerScenarios.ts` with a flexible readonly array contract that supports 8-12 phases/comments, or create a richer scenario frame schema if that keeps state generation clearer.
- Update `buildScenarioFrames` in `ProblemVisualizer.tsx` so it can build all scenario frames, not just four.
- If generic `scenarioData(...)` cannot accurately represent a problem, add explicit per-problem frame payloads instead of forcing the wrong generic state.
- Preserve the existing visualizer UI controls and keyboard behavior.
- Avoid unrelated redesigns.

AI commentary sync contract:
- The source of truth is the selected `LessonFrame`.
- The visible Commentary panel must render `current.commentary`.
- The `VisualizerTutor` payload must include the exact selected frame fields: `frameKey`, `visualType`, `codeLine`, `commentary`, `state`, `active`, `pointers`, and the visual payload (`values`, `matrix`, `stack`, `nodes`, `edges`, `bars`, or `bits`).
- Include `totalSteps` in the `/api/ai/visualizer` request and validate it server-side.
- Update `app/api/ai/visualizer/route.ts` so its system prompt explicitly says:
  - answer only from the provided frame JSON;
  - mention the current step as `step + 1` of `totalSteps`;
  - align with the official frame commentary;
  - call out exact active values/pointers/cells when answering;
  - never invent a frame that is not present.
- If the contest shoutcaster at `app/api/ai/commentator/route.ts` is reused for visualizer narration, add a separate visualizer event mode instead of mixing esports copy into algorithm teaching. It should accept `VISUALIZER_STEP` events with `problemTitle`, `step`, `totalSteps`, `frameKey`, `commentary`, and compact state chips, then return one concise teaching callout.

Verification updates:
- Update `scripts/verify-visualizers.ts` to require:
  - exactly 75 mapped entries unless the catalog intentionally changes;
  - every mapped scenario has at least 8 frames;
  - frame count is usually 8-12;
  - unique phase labels and commentary;
  - input on first frame and output on last frame;
  - valid codeLine bounds;
  - valid visual payload for each `visualType`;
  - valid active/pointer/edge indexes.
- Update `scripts/verify-frame-rendering.ts` to reject 4-frame scenarios and validate all expanded frames.
- Update `scripts/verify-visualizer-context.ts` to assert the tutor payload includes `frameKey`, `totalSteps`, phase, step, commentary, codeLine, visualType, and the matching visual payload for every frame.
- Run visual/layout checks after data changes.

Required commands before completion:
- npm run verify:visualizers
- npx tsx scripts/verify-frame-rendering.ts
- npx tsx scripts/verify-visualizer-context.ts
- npm run test:visualizer-layout
- npm run test:visualizer-catalog
- npx tsc --noEmit

Manual QA checklist:
- Open at least one array, matrix, stack, graph, nodes, bars, and bits visualizer.
- Step through with next/previous buttons and arrow keys.
- Confirm step chips show all 8-12 phases without wrapping badly.
- Confirm the SVG is not blank, clipped, or showing invalid pointers.
- Ask the AI guide "What changed in this step?" on three different steps.
- Confirm the answer references the currently selected frame, not the previous frame.
- Confirm the answer agrees with the visible Commentary text.

Definition of done:
- Every visualizer has 8-12 useful, problem-specific frames.
- The AI guide and visible commentary are synchronized to the same frame payload.
- Verification scripts fail on shallow 4-step lessons.
- All required commands pass.
- The final response lists changed files, verification output, and any residual risks.
```

## Notes For This Repo

The current `VisualizerTutor` already sends a compact frame snapshot to `/api/ai/visualizer`, and the visible commentary panel renders `current.commentary`. The expansion work should preserve that data flow and strengthen the server prompt/validation around it.

The current `problemVisualizerScenarios.ts` type uses four-element tuples for `phases` and `comments`; that is the main reason scenarios naturally stop at four steps. Any implementation pass should change that contract before expanding the data.
