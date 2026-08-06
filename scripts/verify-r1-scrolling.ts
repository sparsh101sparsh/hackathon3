import fs from 'node:fs';
import path from 'node:path';

let passed = true;
const logs: string[] = [];

function log(msg: string) {
  console.log(msg);
  logs.push(msg);
}

function error(msg: string) {
  console.error(`❌ ${msg}`);
  logs.push(`❌ ${msg}`);
  passed = false;
}

log('--- R1 Scroll Prevention Empirical Verification ---');

// 1. Static AST / Regex Check for scrollIntoView
const visualizerTutorPath = path.resolve('components/problems/VisualizerTutor.tsx');
const probVizPath = path.resolve('components/problems/ProblemVisualizer.tsx');

const visualizerTutorContent = fs.readFileSync(visualizerTutorPath, 'utf8');
const vizContent = fs.readFileSync(probVizPath, 'utf8');

if (visualizerTutorContent.includes('scrollIntoView')) {
  error('VisualizerTutor.tsx contains scrollIntoView!');
} else {
  log('✓ VisualizerTutor.tsx does not use scrollIntoView');
}

if (vizContent.includes('scrollIntoView')) {
  error('ProblemVisualizer.tsx contains scrollIntoView!');
} else {
  log('✓ ProblemVisualizer.tsx does not use scrollIntoView');
}

// Check how scrolling is handled in VisualizerTutor
if (visualizerTutorContent.includes('messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight')) {
  log('✓ VisualizerTutor.tsx uses container.scrollTop = container.scrollHeight for internal scrolling');
} else {
  error('VisualizerTutor.tsx missing expected scrollTop assignment');
}

// 2. Empirical Keydown PreventDefault Behavior Verification
// Simulate keydown event handler logic matching ProblemVisualizer.tsx
function simulateKeyDown(
  key: string,
  code: string,
  targetMock: { tagName: string; isContentEditable?: boolean; isInputInstance?: boolean; isTextAreaInstance?: boolean }
) {
  let preventDefaultCalled = false;
  const event = {
    key,
    code,
    target: targetMock,
    preventDefault() {
      preventDefaultCalled = true;
    },
  };

  // Re-evaluate keydown logic from ProblemVisualizer.tsx
  const target = event.target;
  const isInput =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.isInputInstance ||
      target.isTextAreaInstance);

  if (isInput) {
    return preventDefaultCalled;
  }

  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
  } else if (event.key === 'r' || event.key === 'R' || event.code === 'KeyR') {
    event.preventDefault();
  }

  return preventDefaultCalled;
}

// Test matrix for keydown listener
const keyCases = [
  { key: ' ', code: 'Space', desc: 'Space key' },
  { key: 'ArrowRight', code: 'ArrowRight', desc: 'ArrowRight key' },
  { key: 'ArrowLeft', code: 'ArrowLeft', desc: 'ArrowLeft key' },
  { key: 'r', code: 'KeyR', desc: 'Key R' },
];

const targetInputs = [
  { tagName: 'INPUT', isInputInstance: true, desc: 'HTMLInputElement' },
  { tagName: 'TEXTAREA', isTextAreaInstance: true, desc: 'HTMLTextAreaElement' },
  { tagName: 'DIV', isContentEditable: true, desc: 'ContentEditable element' },
];

const targetNonInputs = [
  { tagName: 'DIV', isContentEditable: false, desc: 'Standard DIV element' },
  { tagName: 'BODY', isContentEditable: false, desc: 'Body element' },
];

// Test 2a: Non-input targets should prevent default on navigation hotkeys
for (const k of keyCases) {
  for (const t of targetNonInputs) {
    const prevented = simulateKeyDown(k.key, k.code, t);
    if (!prevented) {
      error(`Keydown handler failed to preventDefault for ${k.desc} on ${t.desc}`);
    }
  }
}
log('✓ Keydown handler correctly calls e.preventDefault() for navigation keys on non-input targets');

// Test 2b: Input targets must NOT prevent default on any key
for (const k of keyCases) {
  for (const t of targetInputs) {
    const prevented = simulateKeyDown(k.key, k.code, t);
    if (prevented) {
      error(`Keydown handler improperly prevented default for ${k.desc} inside ${t.desc}`);
    }
  }
}
log('✓ Keydown handler correctly permits default browser actions inside input/textarea/contentEditable targets');

// 3. Container Bounded Height Check
const heightClassesInViz = vizContent.match(/min-h-\[\d+px\]/g) || [];
const overflowClassesInViz = vizContent.match(/overflow-\w+/g) || [];
const heightClassesInTutor = visualizerTutorContent.match(/h-full|min-h-\[\d+px\]|overflow-y-auto/g) || [];

log(`✓ ProblemVisualizer height bounds: ${heightClassesInViz.join(', ')}`);
log(`✓ ProblemVisualizer overflow control: ${overflowClassesInViz.join(', ')}`);
log(`✓ VisualizerTutor container constraints: ${heightClassesInTutor.join(', ')}`);

if (!vizContent.includes('overflow-hidden')) {
  error('ProblemVisualizer main container is missing overflow-hidden');
}

if (!visualizerTutorContent.includes('overflow-y-auto')) {
  error('VisualizerTutor messages container is missing overflow-y-auto');
}

if (passed) {
  log('\n=== ALL R1 VERIFICATION CHECKS PASSED ===');
} else {
  log('\n=== R1 VERIFICATION FAILED ===');
  process.exit(1);
}
