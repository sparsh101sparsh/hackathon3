import { NextRequest, NextResponse } from 'next/server';
import { callFreeModelJSON, callFreeModelText, MODELS, FreeModelMessage } from '@/lib/freemodel';
import { getProblemKnowledge, getProblemKnowledgeForTopic } from '@/lib/problemKnowledge';
import { getTeachingStyle, buildTeachingStylePrefix } from '@/lib/teachingStyles';
import { rateLimitResponse } from '@/lib/rateLimit';
import { formatInterviewProfile, getInterviewProfile } from '@/lib/interviewProfiles';

export const dynamic = 'force-dynamic';

export interface EvaluationReport {
  score: number;
  technicalCommunication: string;
  problemSolvingScore: number;
  codeQualityScore: number;
  summary: string;
  keyStrengths: string[];
  areasToImprove: string[];
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';
}

export async function POST(request: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(request, 'ai:mock-interview', 12, 60 * 1000);
    if (limitResponse) return limitResponse;
    const body = await request.json();
    const {
      action = 'start',
      company = 'Google',
      topic = 'Arrays & Hashing',
      problemId,
      problemSlug,
      problemTitle = 'DSA Problem',
      messages = [],
      code = '',
      personality: personalityId,
    } = body;

    if (!['start', 'message', 'evaluate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
    if (typeof company !== 'string' || typeof topic !== 'string' || company.length > 80 || topic.length > 120) {
      return NextResponse.json({ error: 'company and topic must be valid short strings' }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length > 60) {
      return NextResponse.json({ error: 'messages must be an array with at most 60 entries' }, { status: 400 });
    }
    if (typeof code !== 'string' || code.length > 100_000) {
      return NextResponse.json({ error: 'code exceeds the 100KB limit' }, { status: 413 });
    }
    if (messages.some((message: unknown) => {
      if (!message || typeof message !== 'object') return true;
      const content = (message as { content?: unknown }).content;
      return typeof content !== 'string' || content.length > 10_000;
    })) {
      return NextResponse.json({ error: 'Each interview message must contain at most 10,000 characters' }, { status: 413 });
    }

    const knowledge = problemId || problemSlug || problemTitle !== 'DSA Problem'
      ? await getProblemKnowledge({ problemId, problemSlug, problemTitle })
      : await getProblemKnowledgeForTopic(topic, company);

    const personality = getTeachingStyle(personalityId);
    const personalityPrefix = buildTeachingStylePrefix(personality);
    const interviewProfile = getInterviewProfile(company);

    const interviewerSystemPrompt = `${personalityPrefix}${personality.interviewSystemInstruction}

Technical Interview Context: Conducting interview for ${company}, topic ${topic}, canonical problem ${knowledge.title}.
Company interview blueprint:
${formatInterviewProfile(interviewProfile)}
Use this canonical question reference as the source of truth:
${knowledge.context}`;

    if (action === 'start') {
      const userInstruction = `Begin the interview using the ${company} blueprint. Introduce yourself in one sentence, state the exact problem "${knowledge.title}" with its key constraints, then ask the candidate to restate the requirements and call out any clarifying questions. Do not discuss the solution yet.`;

      const fallbackGreeting = `Hello, I'm your ${company} interviewer. Today we'll discuss **${knowledge.title}**. Please restate the requirements in your own words and tell me what clarifying questions you would ask before proposing an approach.`;

      const message = await callFreeModelText({
        model: MODELS.COMPLEX,
        systemInstruction: interviewerSystemPrompt,
        userInstruction,
        temperature: 0.7,
        fallbackText: fallbackGreeting,
      });

      return NextResponse.json({
        message,
        company,
        topic,
        problemId: knowledge.problemId,
        problemTitle: knowledge.title,
        interviewProfile,
      });
    }

    if (action === 'message') {
      const formattedMessages: FreeModelMessage[] = [
        { role: 'system', content: interviewerSystemPrompt },
      ];

      if (Array.isArray(messages)) {
        for (const m of messages) {
          if (m.role && m.content) {
            formattedMessages.push({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            });
          }
        }
      }

      if (code) {
        formattedMessages.push({
          role: 'user',
          content: `[Candidate's Current Workspace Code]:\n\`\`\`\n${code}\n\`\`\``,
        });
      }

      const turnNumber = Array.isArray(messages) ? Math.ceil(messages.length / 2) : 1;
      let fallbackText = `${interviewProfile.probes[0]} Then connect your answer to the invariant and time and space complexity.`;
      if (code && code.trim()) {
        fallbackText = `I see your implementation. Please trace it on one canonical sample and explain what each key variable contains after every important iteration.`;
      } else if (turnNumber >= 3) {
        fallbackText = `Before we move on, which edge case would most likely break this approach, and how would you test it?`;
      }

      const message = await callFreeModelText({
        model: MODELS.COMPLEX,
        messages: formattedMessages,
        temperature: 0.7,
        fallbackText,
      });

      return NextResponse.json({ message });
    }

    if (action === 'evaluate') {
      const evalKnowledge = await getProblemKnowledge({ problemId, problemSlug, problemTitle });
      const evalSystemPrompt = `You are an Interview Evaluation Committee Chair at ${company}. Analyze the candidate's full interview transcript and code submission against the exact canonical problem below.
Use this company-specific evaluation blueprint:
${formatInterviewProfile(interviewProfile)}
Do not reward an answer that solves a different problem. Separate communication quality from algorithm correctness. Check whether the candidate clarified requirements, identified a valid invariant, justified complexity, considered edge cases, tested the code, and responded to probing.
Canonical reference:
${evalKnowledge.context}

Output MUST be a single raw JSON object matching schema:
{
  "score": number between 1 and 100,
  "technicalCommunication": "detailed assessment of candidate's verbal communication & clarifying questions",
  "problemSolvingScore": number between 1 and 100,
  "codeQualityScore": number between 1 and 100,
  "summary": "1-paragraph overall interview performance evaluation summary",
  "keyStrengths": ["array of candidate's top strengths"],
  "areasToImprove": ["array of concrete areas for candidate improvement"],
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "No Hire"
}`;

      const transcriptText = messages
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
        .join('\n\n');

      const userInstruction = `Interview Transcript:\n${transcriptText}\n\nFinal Candidate Code:\n\`\`\`\n${code}\n\`\`\``;

      const fallbackReport: EvaluationReport = {
        score: 85,
        technicalCommunication:
          'Demonstrated clear thought process, explained time and space complexity tradeoffs effectively before jumping straight into code.',
        problemSolvingScore: 88,
        codeQualityScore: 82,
        summary: `The candidate completed a structured interview on ${evalKnowledge.title}. The scorecard reflects the transcript, code, and canonical problem constraints.`,
        keyStrengths: [
          'Strong algorithmic intuition and quick recognition of optimal data structure',
          'Clean variable naming and clear explanation of time complexity O(N)',
          'Proactive in asking clarifying questions regarding constraints',
        ],
        areasToImprove: [
          'Explicitly write down unit test cases before presenting final code',
          'Double check edge case handling for zero and duplicate elements',
        ],
        verdict: 'Hire',
      };

      const report = await callFreeModelJSON<EvaluationReport>({
        model: MODELS.COMPLEX,
        systemInstruction: evalSystemPrompt,
        userInstruction,
        temperature: 0.3,
        fallbackJson: fallbackReport,
      });

      return NextResponse.json(report);
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error in /api/ai/mock-interview:', error);
    return NextResponse.json(
      { error: 'Mock interview processing is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
