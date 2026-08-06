'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SystemDesignEvalResponse } from '@/app/api/ai/system-design/route';
import {
  Server,
  Sparkles,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Scale,
  Award,
} from 'lucide-react';

const PRESET_SCENARIOS = [
  {
    company: 'Google',
    topic: 'Design a Distributed Rate Limiter (Token Bucket / Redis)',
    template: `### System Design Proposal: Distributed Rate Limiter

1. **Requirements & QPS**:
   - Total Users: 500 Million MAU, Peak QPS: 100,000 requests/sec.
   - Latency Target: < 5ms evaluation overhead per request.

2. **Architecture & Components**:
   - API Gateway with Edge Rate Limiter middleware (Envoy / Nginx).
   - Redis Cluster with Redis Lua Scripts to enforce atomic Token Bucket algorithm.
   - Fallback Local In-Memory LRU Cache if Redis cluster is unreachable.

3. **Data Model**:
   - Key format: \`rate_limit:{user_id}:{endpoint}:{minute_timestamp}\`
   - Value: Counter integer with 60-second TTL.

4. **Scalability & High Availability**:
   - Consistent Hashing across 16 Redis Shards.
   - Asynchronous logging via Kafka for rate-limit analytics.`,
  },
  {
    company: 'Uber',
    topic: 'Design a Real-Time Ridesharing & Location Tracking System',
    template: `### System Design Proposal: Uber Rideshare Location Tracking

1. **Requirements & QPS**:
   - 10M active drivers pinging GPS coordinates every 4 seconds -> 2.5M GPS updates/sec.
   - Read QPS: 500,000 requests/sec for passenger rider tracking.

2. **Architecture**:
   - WebSocket Gateway Nodes maintaining persistent TCP connections with Driver Apps.
   - Geospatial Indexing Engine using H3 / S2 Geometry Cells.
   - Apache Kafka stream ingestion pipeline routing to Redis GeoSpatial Cache.

3. **Database & Storage**:
   - Cassandra for raw historical driver trip telemetry append-only log.
   - Redis Spatial Index for current active driver location lookups.`,
  },
  {
    company: 'Meta',
    topic: 'Design WhatsApp / Messenger Real-Time Chat Infrastructure',
    template: `### System Design Proposal: WhatsApp Distributed Messaging Platform

1. **Requirements & QPS**:
   - 2 Billion Active Users, 100 Billion Messages / Day -> Average 1.15M msg/sec.
   - End-to-End Encryption (Signal Protocol), Sub-second delivery latency.

2. **Core Components**:
   - Connection Managers handling TLS WebSocket sessions.
   - Message Router Service + Push Notification Gateway (APNS / FCM).
   - Distributed Message Queue (RocketMQ / Pulsar).

3. **Data & Storage**:
   - RocksDB on Edge Server nodes for client store.
   - HBase / Cassandra for undelivered offline message queue buffer.`,
  },
];

export default function SystemDesignPage() {
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0]);
  const [architectureDoc, setArchitectureDoc] = useState(PRESET_SCENARIOS[0].template);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<SystemDesignEvalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const evaluationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => evaluationControllerRef.current?.abort();
  }, []);

  const handleSelectScenario = (scen: (typeof PRESET_SCENARIOS)[0]) => {
    setSelectedScenario(scen);
    setArchitectureDoc(scen.template);
    setResult(null);
    setError(null);
  };

  const handleEvaluate = async () => {
    if (!architectureDoc.trim()) return;
    evaluationControllerRef.current?.abort();
    const controller = new AbortController();
    evaluationControllerRef.current = controller;
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/system-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          architectureDoc,
          company: selectedScenario.company,
          topic: selectedScenario.topic,
        }),
      });

      if (!res.ok) throw new Error('Failed to evaluate system design');
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      if (evaluationControllerRef.current === controller) {
        evaluationControllerRef.current = null;
        if (!controller.signal.aborted) setEvaluating(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0f0f12] border border-white/10 rounded-xl p-6 shadow-xl space-y-3">
        <Link href="/company" className="text-xs text-amber-400 flex items-center gap-1 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Back to Tech Companies
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Server className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                System Design Evaluator
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Architect real-world distributed systems and get instant Principal Engineer feedback powered by FreeModel.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-700/60 px-3 py-1.5 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>Guidance provider: FreeModel</span>
          </div>
        </div>
      </div>

      {/* Preset Scenarios Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Select Interview System Scenario:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_SCENARIOS.map((scen, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectScenario(scen)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedScenario.topic === scen.topic
                  ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-amber-400 uppercase">
                {scen.company}
              </span>
              <h4 className="text-xs font-bold mt-0.5 line-clamp-1">{scen.topic}</h4>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Architecture Proposal Editor */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 backdrop-blur-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Architecture Proposal Document
              </h3>
              <span className="text-[11px] text-slate-400">Markdown supported</span>
            </div>

            <textarea
              aria-label="Architecture proposal"
              value={architectureDoc}
              onChange={(e) => setArchitectureDoc(e.target.value)}
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
              placeholder="Detail your system design: components, database choices, QPS estimations, caching strategy..."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleEvaluate}
              disabled={evaluating || !architectureDoc.trim()}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold rounded-lg text-xs transition-all shadow-lg shadow-amber-950/30 flex items-center gap-2 disabled:opacity-50"
            >
              {evaluating ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-yellow-300" />
              )}
              <span>Evaluate Architecture</span>
            </button>
          </div>
        </div>

        {/* Right Column: evaluation output */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Principal Architect Review & Score
            </h3>
            {result && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-950 text-amber-300 border border-amber-700">
                Score: {result.score} / 100
              </span>
            )}
          </div>

          {evaluating && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs">Analyzing distributed scalability, bottlenecks, & trade-offs...</p>
            </div>
          )}

          {error && !evaluating && (
            <div role="alert" aria-live="assertive" className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
              {error}
            </div>
          )}

          {!result && !evaluating && !error && (
            <div className="py-20 text-center text-slate-500 text-xs">
              Click <strong className="text-amber-400">Evaluate Architecture</strong> to analyze your system proposal.
            </div>
          )}

          {result && !evaluating && (
            <div className="space-y-4 text-xs">
              {/* Scalability Analysis */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-1">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  Scalability & Fault-Tolerance Analysis
                </span>
                <p className="text-slate-300 leading-relaxed">{result.scalabilityAnalysis}</p>
              </div>

              {/* Bottleneck Breakdown */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Identified Bottlenecks & Failure Risks
                </span>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {result.bottleneckBreakdown.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Engineering Recommendations
                </span>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {result.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Tradeoffs */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Architectural Tradeoffs
                </span>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {result.tradeoffs.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
