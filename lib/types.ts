export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ExecutionVerdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'TLE'
  | 'Time Limit Exceeded'
  | 'MLE'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error';

export interface PistonResult {
  status: string;
  stdout: string;
  stderr: string;
  executionTime: number; // in seconds or ms
  memory: number; // in KB or MB
  verdict: ExecutionVerdict;
}

export interface TestCaseResult {
  testCaseId?: string;
  isSample?: boolean;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  executionTime?: number;
  memory?: number;
  verdict: ExecutionVerdict;
}

export interface ExecuteApiResponse {
  verdict: ExecutionVerdict;
  stdout: string;
  stderr: string;
  executionTime: number;
  memory: number;
  learning?: {
    failureCount: number;
    failureType: ExecutionVerdict;
    pattern: string;
  } | null;
  testResults?: TestCaseResult[];
}

export interface SubmissionApiResponse {
  id?: string;
  verdict: ExecutionVerdict;
  passedCount: number;
  totalCount: number;
  executionTime: number;
  memory: number;
  failedTestCase?: {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    error?: string;
  } | null;
  learning?: {
    failureCount: number;
    failureType: ExecutionVerdict;
    pattern: string;
  } | null;
  testResults: TestCaseResult[];
  createdAt?: string;
}

export interface TestCase {
  id: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  explanation?: string | null;
}

export interface CodeTemplate {
  id: string;
  problemId: string;
  language: string;
  code: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: Difficulty;
  topicTags: string[];
  companyTags: string[];
  editorial: string;
  timeLimit: number;
  memoryLimit: number;
  createdAt: string | Date;
  testCases?: TestCase[];
  codeTemplates?: CodeTemplate[];
  solved?: boolean;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  code: string;
  language: string;
  status: ExecutionVerdict;
  executionTime?: number | null;
  memory?: number | null;
  failedTestCase?: string | null;
  createdAt: string | Date;
  problem?: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface RevisionProblemData {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topicTags: string;
  statement: string;
  editorial: string;
}

export interface RevisionCardDTO {
  id: string;
  problemId: string;
  pattern: string;
  keyTakeaway: string;
  timeComplexity: string;
  spaceComplexity: string;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt: string | null;
  failureCount: number;
  lastFailureType: string | null;
  lastError: string | null;
  lastFailedInput: string | null;
  lastExpectedOutput: string | null;
  lastActualOutput: string | null;
  learnedAt: string | null;
  createdAt: string;
  problem: RevisionProblemData;
}

export interface RevisionDeckStats {
  totalCards: number;
  dueTodayCount: number;
  masteredCount: number;
  learnedMistakeCount: number;
  nextDueDate: string | null;
}

export interface RevisionDeckResponse {
  cards: RevisionCardDTO[];
  dueCards: RevisionCardDTO[];
  stats: RevisionDeckStats;
}
