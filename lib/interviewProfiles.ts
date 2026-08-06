export interface InterviewProfile {
  company: string;
  format: string;
  priorities: string[];
  probes: string[];
  evaluationSignals: string[];
}

const DEFAULT_PROFILE: InterviewProfile = {
  company: 'General practice',
  format: 'A structured coding interview with clarification, approach, implementation, testing, and complexity review.',
  priorities: ['clear requirements', 'correct invariants', 'edge-case coverage', 'complexity justification'],
  probes: ['What assumptions are you making?', 'How would you test the boundary cases?', 'Can you improve the complexity?'],
  evaluationSignals: ['communication', 'algorithm correctness', 'testing discipline', 'code quality'],
};

const PROFILES: Record<string, Omit<InterviewProfile, 'company'>> = {
  Google: {
    format: 'A reasoning-heavy algorithm interview with progressive follow-up constraints.',
    priorities: ['problem decomposition', 'optimal algorithms', 'proof of correctness', 'complexity tradeoffs'],
    probes: ['Can you derive a tighter bound?', 'What changes if the input is streamed?', 'Prove why the invariant remains true.'],
    evaluationSignals: ['depth of reasoning', 'optimality', 'adaptability to follow-ups', 'clarity'],
  },
  Meta: {
    format: 'A fast-paced coding interview that emphasizes clean implementation and iterative refinement.',
    priorities: ['clarifying quickly', 'clean data structures', 'bug-free implementation', 'runtime awareness'],
    probes: ['Walk through the code line by line.', 'What is the simplest correct version?', 'Which test would you write first?'],
    evaluationSignals: ['implementation accuracy', 'speed with control', 'testing', 'communication'],
  },
  Amazon: {
    format: 'A structured problem-solving interview with explicit edge-case and tradeoff follow-ups.',
    priorities: ['requirements clarification', 'robustness', 'tradeoff explanation', 'test planning'],
    probes: ['Which requirement is ambiguous?', 'What failure mode is most likely?', 'How would you monitor this in production?'],
    evaluationSignals: ['customer-minded reasoning', 'robustness', 'ownership', 'technical clarity'],
  },
  Microsoft: {
    format: 'A collaborative coding interview focused on explanation, correctness, and maintainable code.',
    priorities: ['communication', 'correct baseline solution', 'readability', 'incremental testing'],
    probes: ['What would you refactor before merging?', 'Can you test this with a small example?', 'What is the clearest data structure here?'],
    evaluationSignals: ['collaboration', 'correctness', 'maintainability', 'testing'],
  },
  Apple: {
    format: 'A practical engineering interview connecting algorithm choices to constraints and product behavior.',
    priorities: ['constraints', 'resource awareness', 'correctness', 'user-impacting edge cases'],
    probes: ['Which resource is the bottleneck?', 'How does this behave on a device-sized input?', 'What happens when input is malformed?'],
    evaluationSignals: ['practical judgment', 'resource tradeoffs', 'correctness', 'attention to detail'],
  },
  Netflix: {
    format: 'A senior engineering interview emphasizing judgment, scalability, and explaining tradeoffs.',
    priorities: ['tradeoffs', 'scalability', 'failure handling', 'simple interfaces'],
    probes: ['How does this scale by an order of magnitude?', 'What fails first?', 'What would you intentionally leave out?'],
    evaluationSignals: ['senior judgment', 'scalability', 'tradeoffs', 'communication'],
  },
  Uber: {
    format: 'A systems-minded coding interview with attention to graphs, real-time constraints, and reliability.',
    priorities: ['latency', 'state transitions', 'failure handling', 'correctness under change'],
    probes: ['What if updates arrive out of order?', 'How do you bound latency?', 'How would you recover after a partial failure?'],
    evaluationSignals: ['systems thinking', 'reliability', 'algorithm correctness', 'tradeoffs'],
  },
};

export function getInterviewProfile(company: string): InterviewProfile {
  const normalized = company.trim();
  return { company: normalized || DEFAULT_PROFILE.company, ...(PROFILES[normalized] || DEFAULT_PROFILE) };
}

export function formatInterviewProfile(profile: InterviewProfile): string {
  return [
    `Interview format: ${profile.format}`,
    `Priorities: ${profile.priorities.join(', ')}`,
    `Use follow-up probes such as: ${profile.probes.join(' | ')}`,
    `Evaluation signals: ${profile.evaluationSignals.join(', ')}`,
  ].join('\n');
}
