import { NextRequest, NextResponse } from 'next/server';
import { callFreeModelText } from '@/lib/freemodel';
import { buildTeachingStylePrefix } from '@/lib/teachingStyles';
import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(req, 'ai:visualizer', 20, 60 * 1000);
    if (limitResponse) return limitResponse;
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { problemTitle, currentFrame, frameKey, step, totalSteps, messages, personality } = await req.json();

    if (typeof problemTitle !== 'string' || problemTitle.length > 300) {
      return NextResponse.json({ error: 'A valid problem title is required' }, { status: 400 });
    }
    if (!Number.isInteger(step) || step < 0 || step > 1000) {
      return NextResponse.json({ error: 'A valid visualizer step is required' }, { status: 400 });
    }
    if (!Number.isInteger(totalSteps) || totalSteps < 1 || totalSteps > 1000 || step >= totalSteps) {
      return NextResponse.json({ error: 'A valid visualizer step count is required' }, { status: 400 });
    }
    if (frameKey !== undefined && (typeof frameKey !== 'string' || frameKey.length > 500)) {
      return NextResponse.json({ error: 'Visualizer frame key is malformed' }, { status: 400 });
    }
    if (currentFrame !== null && (typeof currentFrame !== 'object' || JSON.stringify(currentFrame).length > 30_000)) {
      return NextResponse.json({ error: 'Visualizer frame is too large or malformed' }, { status: 413 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }
    if (messages.length > 40 || messages.some((message: unknown) => {
      if (!message || typeof message !== 'object') return true;
      const content = (message as { content?: unknown }).content;
      return typeof content !== 'string' || content.length > 10_000;
    })) {
      return NextResponse.json({ error: 'Visualizer messages are too large or malformed' }, { status: 413 });
    }

    const userMessage = messages[messages.length - 1].content;
    if (typeof userMessage !== 'string' || !userMessage.trim()) {
      return NextResponse.json({ error: 'The latest visualizer message is required' }, { status: 400 });
    }

    const systemInstruction = `You are an expert Data Structures & Algorithms visualizer guide.
${buildTeachingStylePrefix(personality)}

The user is currently watching an animated algorithm visualizer for the problem "${problemTitle}".
They are on Step ${step + 1} of ${totalSteps}.
Frame key: ${typeof frameKey === 'string' ? frameKey : 'not provided'}.

Here is the EXACT state of the visualizer on the screen right now (in JSON format):
${JSON.stringify(currentFrame, null, 2)}

The official commentary for this step is: "${currentFrame?.commentary}"

The user has just asked a question about this step. Answer only from the provided frame JSON and official commentary.
Mention the current step as Step ${step + 1} of ${totalSteps} when useful. Call out exact active values, pointers, cells, stack entries, graph nodes, bars, or bits that are present in the frame.
Do not invent a previous step, next step, input, output, pointer, or value that is not present in the frame. If the frame is missing something, say what can be inferred from the visible state.
Answer directly, matching your configured personality. Keep it to 2-3 short paragraphs max.`;

    const aiResponse = await callFreeModelText({
      systemInstruction,
      userInstruction: userMessage,
      timeoutMs: 12_000,
      fallbackText: `At step ${step + 1}, focus on the highlighted state and the invariant in the commentary: ${currentFrame?.commentary || 'track how the current state changes before moving to the next frame.'}`,
    });

    return NextResponse.json({ reply: aiResponse });
  } catch (error: unknown) {
    console.error('Visualizer guided Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
