import { NextRequest, NextResponse } from 'next/server';
import { callFreeModelJSON, MODELS } from '@/lib/freemodel';
import { getTeachingStyle, buildTeachingStylePrefix } from '@/lib/teachingStyles';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export interface SystemDesignEvalResponse {
  score: number;
  scalabilityAnalysis: string;
  bottleneckBreakdown: string[];
  recommendations: string[];
  tradeoffs: string[];
}

export async function POST(request: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(request, 'ai:system-design', 10, 60 * 1000);
    if (limitResponse) return limitResponse;
    const body = await request.json();
    const {
      architectureDoc = '',
      company = 'Uber',
      topic = 'Distributed Rate Limiter / Ride Matching',
      personality: personalityId,
    } = body;

    if (!architectureDoc || !architectureDoc.trim()) {
      return NextResponse.json({ error: 'architectureDoc is required' }, { status: 400 });
    }
    if (architectureDoc.length > 50_000) {
      return NextResponse.json({ error: 'architectureDoc exceeds the 50KB limit' }, { status: 413 });
    }

    const personality = getTeachingStyle(personalityId);
    const personalityPrefix = buildTeachingStylePrefix(personality);

    const systemInstruction = `${personalityPrefix}You are a Principal Infrastructure & Distributed Systems Architect reviewing a System Design Proposal for ${company} (${topic}).
Evaluate the architecture document for scalability, fault-tolerance, data model, caching, load balancing, and storage choices.
Output MUST be a single raw JSON object matching schema:
{
  "score": number between 1 and 100,
  "scalabilityAnalysis": "Detailed analysis of system scalability under high QPS & multi-region growth",
  "bottleneckBreakdown": ["array of identified single points of failure, bottleneck components or database locks"],
  "recommendations": ["array of actionable engineering recommendations for optimization"],
  "tradeoffs": ["array of explicit architectural tradeoffs e.g. Consistency vs Availability (CAP Theorem)"]
}`;

    const userInstruction = `Target Company: ${company}
System Design Topic: ${topic}

Candidate Architecture Proposal Document:
${architectureDoc}`;

    const fallbackReport: SystemDesignEvalResponse = {
      score: 84,
      scalabilityAnalysis: `The architecture proposed for ${company} effectively decouples client traffic using API Gateways and message queues (Kafka). Read replicas and Redis caching layer ensure sub-10ms response times for high-volume endpoints.`,
      bottleneckBreakdown: [
        'Single primary database instance risk under high write spikes',
        'Redis cache invalidation race conditions during concurrent user updates',
        'Lack of explicit rate-limiting at edge nodes leading to DDoS vulnerability',
      ],
      recommendations: [
        'Introduce horizontal database sharding based on User ID hash',
        'Implement Token Bucket rate limiting using Distributed Redis cluster',
        'Deploy multi-region failover with active-active database replication',
      ],
      tradeoffs: [
        'Eventual consistency chosen over immediate consistency for feed updates to reduce write latency',
        'In-memory caching improves throughput but introduces potential data stale window of up to 2 seconds',
      ],
    };

    const evalResult = await callFreeModelJSON<SystemDesignEvalResponse>({
      model: MODELS.COMPLEX,
      systemInstruction,
      userInstruction,
      temperature: 0.3,
      fallbackJson: fallbackReport,
    });

    return NextResponse.json(evalResult);
  } catch (error: unknown) {
    console.error('Error in /api/ai/system-design:', error);
    return NextResponse.json(
      { error: 'System design evaluation is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
