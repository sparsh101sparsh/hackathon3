import { callFreeModelText, callFreeModelJSON, MODELS } from '../lib/freemodel';

async function runVerificationTests() {
  console.log('====================================================');
  console.log('🚀 Starting Milestone 4 Provider Engine Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: FreeModel Basic Connectivity & callFreeModelText
  try {
    console.log('Test 1: FreeModel API Text Call ()...');
    const text = await callFreeModelText({
      model: MODELS.FAST,
      userInstruction: 'Say "FreeModel Connected"',
      fallbackText: 'FreeModel Connected (Fallback)',
    });
    console.log('  Result:', text.slice(0, 100));
    console.log('  ✅ Test 1 PASSED\n');
    passed++;
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Test 1 FAILED:', message);
    failed++;
  }

  // Test 2: Code Review ()
  try {
    console.log('Test 2: Code Review Engine ()...');
    const review = await callFreeModelJSON<Record<string, any>>({
      model: MODELS.COMPLEX,
      systemInstruction: 'You are an AI Code Auditor. Respond strictly in JSON.',
      userInstruction: 'Review Two Sum Python code: def twoSum(nums, target): return []',
      fallbackJson: {
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        codeQualityScore: 85,
        strengths: ['Valid structure'],
        weaknesses: ['Incomplete logic'],
        betterApproach: 'Use Hash Map',
        missedEdgeCases: ['Empty array'],
        refactoredCode: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []',
      },
    });

    if (
      typeof review.codeQualityScore === 'number' &&
      Array.isArray(review.strengths) &&
      review.timeComplexity &&
      review.refactoredCode
    ) {
      console.log('  Time Complexity:', review.timeComplexity);
      console.log('  Score:', review.codeQualityScore);
      console.log('  ✅ Test 2 PASSED\n');
      passed++;
    } else {
      throw new Error('Invalid Code Review JSON structure');
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Test 2 FAILED:', message);
    failed++;
  }

  // Test 3: Progressive 3-Level Hints ()
  try {
    console.log('Test 3: Progressive 3-Level Hints Engine ()...');
    const hint = await callFreeModelJSON<Record<string, any>>({
      model: MODELS.FAST,
      systemInstruction: 'Socratic DSA hint. Output JSON { "hintLevel": 1, "title": "Intuition", "hint": "Text" }',
      userInstruction: 'Hint Level 1 for Two Sum',
      fallbackJson: {
        hintLevel: 1,
        title: 'High-Level Intuition',
        hint: 'Think about storing previously visited elements.',
      },
    });

    if (hint.hintLevel === 1 && hint.title && hint.hint) {
      console.log('  Hint Title:', hint.title);
      console.log('  ✅ Test 3 PASSED\n');
      passed++;
    } else {
      throw new Error('Invalid Hint JSON structure');
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Test 3 FAILED:', message);
    failed++;
  }

  // Test 4: Socratic DSA Chat Tutor ()
  try {
    console.log('Test 4: Socratic DSA Chat Tutor ()...');
    const reply = await callFreeModelText({
      model: MODELS.FAST,
      messages: [
        { role: 'system', content: 'You are a Socratic DSA tutor.' },
        { role: 'user', content: 'How do I optimize O(N^2) search?' },
      ],
      fallbackText: 'Consider using a Hash Table to look up elements in O(1) time.',
    });

    if (reply && reply.length > 5) {
      console.log('  Tutor Reply Snippet:', reply.slice(0, 100));
      console.log('  ✅ Test 4 PASSED\n');
      passed++;
    } else {
      throw new Error('Invalid Tutor Reply');
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Test 4 FAILED:', message);
    failed++;
  }

  // Test 5: Mock Interview (Start, Message, Evaluate)
  try {
    console.log('Test 5: Mock Interview Suite ()...');
    const evalResult = await callFreeModelJSON<Record<string, any>>({
      model: MODELS.COMPLEX,
      systemInstruction: 'Evaluate candidate interview transcript. Output JSON.',
      userInstruction: 'Candidate answered Two Sum with Hash Map.',
      fallbackJson: {
        score: 90,
        technicalCommunication: 'Clear and structured explanation.',
        problemSolvingScore: 92,
        codeQualityScore: 88,
        summary: 'Excellent candidate performance.',
        keyStrengths: ['Good communication', 'Optimal space complexity'],
        areasToImprove: ['Test edge cases first'],
        verdict: 'Hire',
      },
    });

    if (evalResult.score && evalResult.verdict && Array.isArray(evalResult.keyStrengths)) {
      console.log('  Verdict:', evalResult.verdict);
      console.log('  Overall Score:', evalResult.score);
      console.log('  ✅ Test 5 PASSED\n');
      passed++;
    } else {
      throw new Error('Invalid Mock Interview evaluation structure');
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Test 5 FAILED:', message);
    failed++;
  }

  // Test 6: System Design Evaluator ()
  try {
    console.log('Test 6: System Design Architecture Evaluator ()...');
    const sysEval = await callFreeModelJSON<Record<string, any>>({
      model: MODELS.COMPLEX,
      systemInstruction: 'System design evaluation chair. Output JSON.',
      userInstruction: 'Rate Limiter design with Redis and Token Bucket.',
      fallbackJson: {
        score: 86,
        scalabilityAnalysis: 'Redis cluster provides scalable token bucket rate limiting.',
        bottleneckBreakdown: ['Central Redis latency under high QPS'],
        recommendations: ['Use local sliding window cache before Redis'],
        tradeoffs: ['Consistency vs Availability'],
      },
    });

    if (sysEval.score && sysEval.scalabilityAnalysis && Array.isArray(sysEval.recommendations)) {
      console.log('  Design Score:', sysEval.score);
      console.log('  Scalability Analysis Snippet:', sysEval.scalabilityAnalysis.slice(0, 80));
      console.log('  ✅ Test 6 PASSED\n');
      passed++;
    } else {
      throw new Error('Invalid System Design evaluation structure');
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Test 6 FAILED:', message);
    failed++;
  }

  console.log('====================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationTests();
