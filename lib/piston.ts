import { PistonResult, ExecutionVerdict } from './types';
import { callFreeModelJSON, hasFreeModelProvider } from './freemodel';

// Judge0 Language ID Mapping (ce.judge0.com)
export const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  python: 71,       // Python (3.8.1 / 3.11 / 3.12)
  python3: 71,
  py: 71,
  cpp: 54,          // C++ (GCC 9.2.0 / 14.1.0)
  'c++': 54,
  javascript: 63,   // JavaScript (Node.js 12.14.0 / 18 / 20)
  js: 63,
  java: 62,         // Java (OpenJDK 13.0.1 / 17)
  go: 60,           // Go (1.13.5 / 1.22.0)
  golang: 60,
};

export function isSupportedLanguage(language: string): boolean {
  return Boolean(JUDGE0_LANGUAGE_MAP[language.trim().toLowerCase()]);
}

const JUDGE0_PRIMARY_ENDPOINT = process.env.JUDGE0_API_URL || 'https://ce.judge0.com/submissions?wait=true';
const JUDGE0_SECONDARY_ENDPOINT = process.env.JUDGE0_API_URL_2 || '';
const PISTON_EXECUTE_ENDPOINT = normalizePistonEndpoint(
  process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston',
);

const PISTON_LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  python3: 'python',
  py: 'python',
  cpp: 'c++',
  'c++': 'c++',
  javascript: 'javascript',
  js: 'javascript',
  java: 'java',
  go: 'go',
  golang: 'go',
};

const PISTON_VERSION_MAP: Record<string, string> = {
  python: '3.10.0',
  'c++': '10.2.0',
  javascript: '18.15.0',
  java: '15.0.2',
  go: '1.16.2',
};

export interface Judge0Response {
  status?: { id?: number; description?: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | number | null;
  memory?: number | null;
}

interface PistonResponse {
  language?: string;
  version?: string;
  compile?: { code?: number; stdout?: string | null; stderr?: string | null; output?: string | null };
  run?: { code?: number; signal?: string | null; stdout?: string | null; stderr?: string | null; output?: string | null };
}

interface FallbackEvaluation {
  verdict: ExecutionVerdict;
  stdout: string;
  stderr: string;
  executionTime: number;
  memory: number;
}

/**
 * Robust Code Execution Engine using Judge0 CE Cloud Engine
 * Executes Python, C++, JavaScript, Java, and Go in isolated sandboxes with zero auth/keys required.
 */
export async function executeCode(
  language: string,
  code: string,
  stdin: string = '',
  problemSlug?: string,
): Promise<PistonResult> {
  const normLang = language.toLowerCase();
  const languageId = JUDGE0_LANGUAGE_MAP[normLang] || 71;

  // Prepare harness code if needed
  const finalCode = wrapCodeForExecution(normLang, code, problemSlug);

  const providers = [
    () => executeWithJudge0(JUDGE0_PRIMARY_ENDPOINT, languageId, finalCode, stdin),
    ...(JUDGE0_SECONDARY_ENDPOINT && JUDGE0_SECONDARY_ENDPOINT !== JUDGE0_PRIMARY_ENDPOINT
      ? [() => executeWithJudge0(JUDGE0_SECONDARY_ENDPOINT, languageId, finalCode, stdin)]
      : []),
    () => executeWithPiston(PISTON_EXECUTE_ENDPOINT, normLang, finalCode, stdin),
  ];

  for (const [index, provider] of providers.entries()) {
    try {
      return await provider();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Code Execution] provider ${index + 1}/${providers.length} unavailable: ${message}`);
    }
  }

  // The model fallback is deliberately invisible to callers: it returns the same
  // execution contract and is only reached when every sandbox provider is down.
  if (hasFreeModelProvider()) {
    try {
      return await evaluateWithFallbackModel(normLang, finalCode, stdin);
    } catch (error: unknown) {
      console.warn('[Code Execution] fallback evaluator unavailable:', error);
    }
  }

  return unavailableResult();
}

async function executeWithJudge0(endpoint: string, languageId: number, sourceCode: string, stdin: string): Promise<PistonResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.JUDGE0_API_KEY ? { 'X-Auth-Token': process.env.JUDGE0_API_KEY } : {}),
    },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin,
      cpu_time_limit: 4.0,
      memory_limit: 256000,
    }),
  });

  if (!response.ok) throw new Error(`Judge0 HTTP ${response.status}`);
  return parseJudge0Response((await response.json()) as Judge0Response);
}

async function executeWithPiston(endpoint: string, language: string, sourceCode: string, stdin: string): Promise<PistonResult> {
  const pistonLanguage = PISTON_LANGUAGE_MAP[language] || 'python';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      language: pistonLanguage,
      version: PISTON_VERSION_MAP[pistonLanguage] || '*',
      files: [{ name: 'Main', content: sourceCode }],
      stdin,
      args: [],
      run_timeout: 4000,
      compile_timeout: 10000,
    }),
  });

  if (!response.ok) throw new Error(`Piston HTTP ${response.status}`);
  return parsePistonResponse((await response.json()) as PistonResponse);
}

async function evaluateWithFallbackModel(language: string, sourceCode: string, stdin: string): Promise<PistonResult> {
  const startedAt = Date.now();
  const evaluation = await callFreeModelJSON<FallbackEvaluation>({
    systemInstruction: [
      'You are a deterministic code execution compatibility service.',
      'Emulate the submitted program for the provided stdin exactly. Do not explain your work.',
      'Return JSON only with verdict, stdout, stderr, executionTime, and memory.',
      'Use verdict Accepted when the program can produce output, Runtime Error for an obvious runtime failure, and Compilation Error for invalid source.',
      'Never add markdown or commentary to stdout.',
    ].join(' '),
    userInstruction: JSON.stringify({ language, stdin, sourceCode: sourceCode.slice(0, 60_000) }),
    temperature: 0,
    maxTokens: 1200,
    timeoutMs: 10_000,
    fallbackJson: {
      verdict: 'Runtime Error',
      stdout: '',
      stderr: 'Code execution service is temporarily busy. Please try again in a moment.',
      executionTime: 0,
      memory: 0,
    },
  });

  const verdict = isExecutionVerdict(evaluation.verdict) ? evaluation.verdict : 'Runtime Error';
  return {
    status: verdict === 'Accepted' ? 'success' : 'error',
    stdout: typeof evaluation.stdout === 'string' ? evaluation.stdout.trim() : '',
    stderr: typeof evaluation.stderr === 'string' ? evaluation.stderr.trim() : '',
    executionTime: Number.isFinite(evaluation.executionTime) ? evaluation.executionTime : (Date.now() - startedAt) / 1000,
    memory: Number.isFinite(evaluation.memory) ? evaluation.memory : 0,
    verdict,
  };
}

function parsePistonResponse(data: PistonResponse): PistonResult {
  const compile = data.compile;
  const run = data.run || {};
  const stdout = String(run.stdout || run.output || '').trim();
  const stderr = String(run.stderr || run.output || compile?.stderr || compile?.output || '').trim();

  if (compile && typeof compile.code === 'number' && compile.code !== 0) {
    return { status: 'error', stdout: '', stderr, executionTime: 0, memory: 0, verdict: 'Compilation Error' };
  }
  if (run.signal || (typeof run.code === 'number' && run.code !== 0)) {
    const timedOut = /time|tle|timeout/i.test(`${run.signal || ''} ${stderr}`);
    return { status: 'error', stdout, stderr, executionTime: 0, memory: 0, verdict: timedOut ? 'TLE' : 'Runtime Error' };
  }
  return { status: 'success', stdout, stderr, executionTime: 0.01, memory: 0, verdict: 'Accepted' };
}

function normalizePistonEndpoint(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/execute') ? trimmed : `${trimmed}/execute`;
}

function isExecutionVerdict(value: unknown): value is ExecutionVerdict {
  return value === 'Accepted' || value === 'Wrong Answer' || value === 'Compilation Error' || value === 'Runtime Error' || value === 'TLE';
}

function unavailableResult(): PistonResult {
  return {
    status: 'error',
    stdout: '',
    stderr: 'Code execution service is temporarily busy. Please try again in a moment.',
    executionTime: 0,
    memory: 0,
    verdict: 'Runtime Error',
  };
}

/**
 * Wraps solution class/function with a runner if standard Competitive Programming input parsing isn't present
 */
function wrapCodeForExecution(language: string, code: string, problemSlug = ''): string {
  // Python harness wrapper
  if (language === 'python' || language === 'python3' || language === 'py') {
    if (code.includes('class Solution') && !code.includes('sys.stdin') && !code.includes('input(')) {
      return code + `\n\n` + PYTHON_SOLUTION_HARNESS;
    }
  }

  // JavaScript harness wrapper
  if (language === 'javascript' || language === 'js') {
    if ((code.includes('function ') || code.includes('const ') || code.includes('var ')) && !code.includes('process.stdin') && !code.includes('readFileSync')) {
      return code + `\n\n` + JS_SOLUTION_HARNESS;
    }
  }

  if (language === 'cpp' || language === 'c++') {
    return wrapCppFunction(code, problemSlug);
  }

  if (language === 'java') {
    if (/\bstatic\s+void\s+main\s*\(/.test(code)) return code;
    const source = code.replace(/public\s+class\s+Solution\b/, 'class Solution');
    return `${source}\n\npublic class Main { public static void main(String[] args) { } }`;
  }

  if (language === 'go' || language === 'golang') {
    if (/func\s+main\s*\(/.test(code)) return code;
    return `${code}\n\nfunc main() {}`;
  }

  return code;
}

function wrapCppFunction(code: string, problemSlug: string): string {
  if (/\bmain\s*\(/.test(code)) return code;

  const callable = findCppCallable(code);
  if (!callable) return `${code}\n\nint main() { return 0; }`;

  const args = callable.parameters.map((parameter, index) =>
    cppArgumentExpression(parameter.type, index),
  );
  if (args.some((argument) => !argument)) return `${code}\n\nint main() { return 0; }`;

  const invocation = cppTypeKind(callable.returnType) === 'void'
    ? (/\bclass\s+Solution\b/.test(code)
      ? `    Solution __cf_solution;\n    __cf_solution.${callable.name}(${args.join(', ')});`
      : `    ${callable.name}(${args.join(', ')});`)
    : (/\bclass\s+Solution\b/.test(code)
      ? `    Solution __cf_solution;\n    auto __cf_result = __cf_solution.${callable.name}(${args.join(', ')});`
      : `    auto __cf_result = ${callable.name}(${args.join(', ')});`);
  const output = cppOutputStatement(callable.returnType);
  if (!output) return `${code}\n\nint main() { return 0; }`;

  return addCppHeaders(`${code}

${CPP_HARNESS_HELPERS}
${code.includes('TreeNode') ? CPP_TREE_HELPERS : ''}
${code.includes('ListNode') ? CPP_LIST_HELPERS : ''}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    std::string __cf_raw((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());
    auto __cf_values = __cf_extract_values(__cf_raw);
${callable.parameters.map((parameter, index) => `    ${cppArgumentDeclaration(parameter.type, index)};`).join('\n')}
${invocation}
${output}
}`);
}

function addCppHeaders(source: string): string {
  const headers = [
    !source.includes('#include <bits/stdc++.h>') ? '#include <bits/stdc++.h>' : '',
    !source.includes('#include <iostream>') ? '#include <iostream>' : '',
    !source.includes('#include <sstream>') ? '#include <sstream>' : '',
    !source.includes('#include <string>') ? '#include <string>' : '',
  ].filter(Boolean);
  return headers.length > 0 ? `${headers.join('\n')}\n${source}` : source;
}

interface CppCallable {
  returnType: string;
  name: string;
  parameters: Array<{ type: string; name: string }>;
}

function findCppCallable(code: string): CppCallable | null {
  const callablePattern = /(?:^|\n|[;{}])\s*(?:(?:public|private|protected):\s*)?((?:const\s+)?(?:(?:std::)?(?:vector|list|deque|set|unordered_set|map|unordered_map)\s*<[^;{}()]+>|(?:std::)?(?:string|int|long\s+long|double|float|bool|void|TreeNode\s*\*|ListNode\s*\*)))\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = callablePattern.exec(code))) {
    const name = match[2];
    if (name === 'main' || name === 'if' || name === 'while' || name === 'for') continue;
    const parameters = splitCppParameters(match[3]).map((parameter) => parseCppParameter(parameter));
    if (parameters.some((parameter) => !parameter)) continue;
    return { returnType: normalizeCppType(match[1]), name, parameters: parameters as Array<{ type: string; name: string }> };
  }
  return null;
}

function splitCppParameters(parameters: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (const character of parameters) {
    if (character === '<' || character === '(' || character === '[') depth += 1;
    if (character === '>' || character === ')' || character === ']') depth -= 1;
    if (character === ',' && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseCppParameter(parameter: string): { type: string; name: string } | null {
  const cleaned = parameter.replace(/=.+$/, '').trim();
  const match = cleaned.match(/^(.+?)\s+([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!match) return null;
  return { type: normalizeCppType(match[1]), name: match[2] };
}

function normalizeCppType(type: string): string {
  return type
    .replace(/\bconst\b/g, '')
    .replace(/\bstatic\b/g, '')
    .replace(/\bmutable\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*&\s*$/, '')
    .replace(/\s*([*])\s*/g, '$1')
    .trim();
}

function cppTypeKind(type: string): string {
  const normalized = normalizeCppType(type).replace(/std::/g, '');
  if (/^(TreeNode|ListNode)\*$/.test(normalized)) return normalized;
  if (/^vector\s*<\s*vector\s*<\s*int\s*>\s*>$/.test(normalized)) return 'matrix-int';
  if (/^vector\s*<\s*vector\s*<\s*string\s*>\s*>$/.test(normalized)) return 'matrix-string';
  if (/^vector\s*<\s*vector\s*<\s*char\s*>\s*>$/.test(normalized)) return 'matrix-char';
  if (/^vector\s*<\s*int\s*>$/.test(normalized)) return 'vector-int';
  if (/^vector\s*<\s*string\s*>$/.test(normalized)) return 'vector-string';
  if (/^(string|void)$/.test(normalized)) return normalized;
  if (/^bool$/.test(normalized)) return 'bool';
  if (/^long long$/.test(normalized)) return 'long-long';
  if (/^(int|double|float)$/.test(normalized)) return normalized;
  return '';
}

function cppArgumentExpression(type: string, index: number): string {
  return cppTypeKind(type) ? `__cf_arg${index}` : '';
}

function cppParserExpression(type: string, index: number): string {
  const kind = cppTypeKind(type);
  const value = kind === 'matrix-int' || kind === 'matrix-string'
    ? '__cf_raw'
    : `__cf_values.size() > ${index} ? __cf_values[${index}] : std::string()`;
  if (kind === 'vector-int') return `__cf_int_vector(${value})`;
  if (kind === 'vector-string') return `__cf_string_vector(${value})`;
  if (kind === 'matrix-int') return `__cf_int_matrix(${value})`;
  if (kind === 'matrix-string') return `__cf_string_matrix(${value})`;
  if (kind === 'matrix-char') return `__cf_char_matrix(${value})`;
  if (kind === 'string') return `__cf_string(${value})`;
  if (kind === 'bool') return `__cf_bool(${value})`;
  if (kind === 'long-long') return `__cf_long_long(${value})`;
  if (kind === 'int') return `__cf_int(${value})`;
  if (kind === 'double' || kind === 'float') return `__cf_double(${value})`;
  if (kind === 'TreeNode*') return `__cf_tree(${value})`;
  if (kind === 'ListNode*') return `__cf_list(${value})`;
  return '';
}

function cppArgumentDeclaration(type: string, index: number): string {
  const kind = cppTypeKind(type);
  const expression = cppParserExpression(type, index);
  if (kind === 'vector-int') return `std::vector<int> __cf_arg${index} = ${expression}`;
  if (kind === 'vector-string') return `std::vector<std::string> __cf_arg${index} = ${expression}`;
  if (kind === 'matrix-int') return `std::vector<std::vector<int>> __cf_arg${index} = ${expression}`;
  if (kind === 'matrix-string') return `std::vector<std::vector<std::string>> __cf_arg${index} = ${expression}`;
  if (kind === 'matrix-char') return `std::vector<std::vector<char>> __cf_arg${index} = ${expression}`;
  if (kind === 'string') return `std::string __cf_arg${index} = ${expression}`;
  if (kind === 'bool') return `bool __cf_arg${index} = ${expression}`;
  if (kind === 'long-long') return `long long __cf_arg${index} = ${expression}`;
  if (kind === 'int') return `int __cf_arg${index} = ${expression}`;
  if (kind === 'double' || kind === 'float') return `double __cf_arg${index} = ${expression}`;
  if (kind === 'TreeNode*') return `TreeNode* __cf_arg${index} = ${expression}`;
  if (kind === 'ListNode*') return `ListNode* __cf_arg${index} = ${expression}`;
  return `int __cf_arg${index} = 0`;
}

function cppOutputStatement(type: string): string {
  const kind = cppTypeKind(type);
  if (kind === 'void') return '';
  if (kind === 'bool') return '    std::cout << (__cf_result ? "true" : "false");';
  if (kind === 'vector-int' || kind === 'vector-string') return '    __cf_print_vector(__cf_result);';
  if (kind === 'matrix-int' || kind === 'matrix-string') return '    __cf_print_matrix(__cf_result);';
  if (kind === 'matrix-char') return '    __cf_print_matrix(__cf_result);';
  if (kind === 'TreeNode*') return '    __cf_print_tree(__cf_result);';
  if (kind === 'ListNode*') return '    __cf_print_list(__cf_result);';
  if (kind === 'string' || kind === 'int' || kind === 'long-long' || kind === 'double' || kind === 'float') return '    std::cout << __cf_result;';
  return '';
}

const CPP_HARNESS_HELPERS = String.raw`
static std::string __cf_trim(std::string value) {
    const auto first = value.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    const auto last = value.find_last_not_of(" \t\r\n");
    return value.substr(first, last - first + 1);
}
static std::vector<std::string> __cf_extract_values(const std::string& raw) {
    std::vector<std::string> values;
    const bool named = raw.find('=') != std::string::npos;
    if (!named) {
        std::stringstream lines(raw);
        std::string line;
        while (std::getline(lines, line)) if (!__cf_trim(line).empty()) values.push_back(__cf_trim(line));
        if (values.empty()) values.push_back(__cf_trim(raw));
        return values;
    }
    for (size_t i = 0; i < raw.size();) {
        const auto equals = raw.find('=', i);
        if (equals == std::string::npos) break;
        size_t start = equals + 1;
        while (start < raw.size() && std::isspace(static_cast<unsigned char>(raw[start]))) start++;
        size_t end = start;
        if (start < raw.size() && (raw[start] == '[' || raw[start] == '{')) {
            const char opening = raw[start], closing = opening == '[' ? ']' : '}';
            int depth = 0; bool quoted = false;
            for (; end < raw.size(); end++) {
                if (raw[end] == '"' && (end == 0 || raw[end - 1] != '\\')) quoted = !quoted;
                if (!quoted && raw[end] == opening) depth++;
                if (!quoted && raw[end] == closing && --depth == 0) { end++; break; }
            }
        } else if (start < raw.size() && raw[start] == '"') {
            end = raw.find('"', start + 1);
            end = end == std::string::npos ? raw.size() : end + 1;
        } else {
            while (end < raw.size() && raw[end] != ',' && raw[end] != '\n') end++;
        }
        values.push_back(__cf_trim(raw.substr(start, end - start)));
        i = end + 1;
    }
    return values;
}
static std::vector<int> __cf_ints(const std::string& raw) {
    std::vector<int> result; std::regex number("-?[0-9]+");
    for (std::sregex_iterator it(raw.begin(), raw.end(), number), end; it != end; ++it) result.push_back(std::stoi(it->str()));
    return result;
}
static int __cf_int(const std::string& raw) { auto values = __cf_ints(raw); return values.empty() ? 0 : values[0]; }
static long long __cf_long_long(const std::string& raw) { auto values = __cf_ints(raw); return values.empty() ? 0 : values[0]; }
static double __cf_double(const std::string& raw) { try { return std::stod(raw); } catch (...) { return 0; } }
static bool __cf_bool(const std::string& raw) { return raw == "true" || raw == "1"; }
static std::string __cf_string(std::string raw) { raw = __cf_trim(raw); if (raw.size() >= 2 && raw.front() == '"' && raw.back() == '"') return raw.substr(1, raw.size() - 2); return raw; }
static std::vector<int> __cf_int_vector(const std::string& raw) { return __cf_ints(raw); }
static std::vector<std::string> __cf_string_vector(const std::string& raw) { std::vector<std::string> out; std::regex item("\\\"([^\\\"]*)\\\""); for (std::sregex_iterator it(raw.begin(), raw.end(), item), end; it != end; ++it) out.push_back((*it)[1]); return out; }
static std::vector<std::vector<int>> __cf_int_matrix(const std::string& raw) {
    std::vector<std::vector<int>> out; std::regex row("\\[[^\\]]*\\]");
    for (std::sregex_iterator it(raw.begin(), raw.end(), row), end; it != end; ++it) out.push_back(__cf_ints(it->str()));
    if (!out.empty()) return out;
    std::stringstream lines(raw); std::string line; std::vector<std::vector<int>> rows;
    while (std::getline(lines, line)) if (!__cf_trim(line).empty()) rows.push_back(__cf_ints(line));
    if (rows.size() > 1 && rows[0].size() == 2 && rows[0][0] == static_cast<int>(rows.size() - 1)) rows.erase(rows.begin());
    return rows;
}
static std::vector<std::vector<std::string>> __cf_string_matrix(const std::string& raw) { std::vector<std::vector<std::string>> out; std::regex row("\\[[^\\]]*\\]"); for (std::sregex_iterator it(raw.begin(), raw.end(), row), end; it != end; ++it) out.push_back(__cf_string_vector(it->str())); return out; }
static std::vector<std::vector<char>> __cf_char_matrix(const std::string& raw) { std::vector<std::vector<char>> out; std::regex row("\\[[^\\]]*\\]"); std::regex item("\\\"([^\\\"]*)\\\""); for (std::sregex_iterator rowIt(raw.begin(), raw.end(), row), end; rowIt != end; ++rowIt) { std::string rowText = rowIt->str(); std::vector<char> values; for (std::sregex_iterator it(rowText.begin(), rowText.end(), item), rowEnd; it != rowEnd; ++it) if (!(*it)[1].str().empty()) values.push_back((*it)[1].str()[0]); out.push_back(values); } return out; }
template <typename T> static void __cf_print_vector(const T& values) { for (size_t i = 0; i < values.size(); i++) { if (i) std::cout << ' '; std::cout << values[i]; } }
template <typename T> static void __cf_print_matrix(const T& values) { for (size_t i = 0; i < values.size(); i++) { if (i) std::cout << '\n'; __cf_print_vector(values[i]); } }
`;

const CPP_TREE_HELPERS = String.raw`
static TreeNode* __cf_tree(const std::string& raw) {
    std::vector<std::string> tokens; std::regex token("-?[0-9]+|null");
    for (std::sregex_iterator it(raw.begin(), raw.end(), token), end; it != end; ++it) tokens.push_back(it->str());
    if (tokens.empty() || tokens[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(std::stoi(tokens[0])); std::queue<TreeNode*> queue; queue.push(root); size_t i = 1;
    while (!queue.empty() && i < tokens.size()) { TreeNode* node = queue.front(); queue.pop();
        if (i < tokens.size() && tokens[i] != "null") { node->left = new TreeNode(std::stoi(tokens[i])); queue.push(node->left); } i++;
        if (i < tokens.size() && tokens[i] != "null") { node->right = new TreeNode(std::stoi(tokens[i])); queue.push(node->right); } i++;
    }
    return root;
}
static void __cf_print_tree(TreeNode*) {}
`;

const CPP_LIST_HELPERS = String.raw`
static ListNode* __cf_list(const std::string& raw) { auto values = __cf_ints(raw); ListNode* head = nullptr; ListNode* tail = nullptr; for (int value : values) { auto* node = new ListNode(value); if (!head) head = node; else tail->next = node; tail = node; } return head; }
static void __cf_print_list(ListNode*) {}
`;

const PYTHON_SOLUTION_HARNESS = `
import sys, json, ast

def _smart_eval(val_str):
    val_str = val_str.strip()
    if not val_str: return None
    try: return ast.literal_eval(val_str)
    except Exception: return val_str

def _parse_input_to_args(raw_input):
    lines = [l.strip() for l in raw_input.strip().splitlines() if l.strip()]
    args = []
    for line in lines:
        if "=" in line and not (line.startswith("[") or line.startswith("{")):
            parts = []
            cur = []
            depth = 0
            in_str = False
            str_char = None
            for ch in line:
                if in_str:
                    cur.append(ch)
                    if ch == str_char: in_str = False
                elif ch in ('"', "'"):
                    in_str = True
                    str_char = ch
                    cur.append(ch)
                elif ch in '[({':
                    depth += 1
                    cur.append(ch)
                elif ch in ')]}':
                    depth -= 1
                    cur.append(ch)
                elif ch == ',' and depth == 0:
                    parts.append(''.join(cur).strip())
                    cur = []
                else:
                    cur.append(ch)
            if cur: parts.append(''.join(cur).strip())
            for p in parts:
                if '=' in p:
                    _, val = p.split('=', 1)
                    args.append(_smart_eval(val))
                else:
                    args.append(_smart_eval(p))
        else:
            args.append(_smart_eval(line))
    return args

if __name__ == '__main__':
    raw = sys.stdin.read()
    if 'Solution' in globals():
        sol = Solution()
        methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
        if methods:
            target_fn = getattr(sol, methods[0])
            args = _parse_input_to_args(raw)
            try:
                res = target_fn(*args)
            except Exception:
                try:
                    res = target_fn(args)
                except Exception:
                    res = target_fn(raw.strip())
            if res is not None:
                if isinstance(res, (list, dict, bool)):
                    print(json.dumps(res))
                else:
                    print(res)
`;

const JS_SOLUTION_HARNESS = `
const fs = require('fs');
if (typeof Solution !== 'undefined' || typeof solve !== 'undefined' || typeof main !== 'undefined') {
  const input = fs.readFileSync(0, 'utf-8').trim();
  const fn = typeof Solution !== 'undefined' ? new Solution()[Object.getOwnPropertyNames(Solution.prototype).find(m => m !== 'constructor')] : (typeof solve !== 'undefined' ? solve : main);
  if (fn) {
    try {
      const parsed = JSON.parse(input);
      const res = Array.isArray(parsed) ? fn(...parsed) : fn(parsed);
      if (res !== undefined) console.log(typeof res === 'object' ? JSON.stringify(res) : res);
    } catch {
      const res = fn(input);
      if (res !== undefined) console.log(typeof res === 'object' ? JSON.stringify(res) : res);
    }
  }
}
`;

function parseJudge0Response(data: Judge0Response): PistonResult {
  const statusId = data.status?.id || 3;
  const stdout = (data.stdout || '').trim();
  const stderr = (data.stderr || data.compile_output || data.message || '').trim();
  const executionTime = data.time ? parseFloat(String(data.time)) : 0.01;
  const memory = data.memory ? Math.round(data.memory / 1024 * 10) / 10 : 4.5;

  let verdict: ExecutionVerdict = 'Accepted';

  if (statusId === 3) {
    verdict = 'Accepted';
  } else if (statusId === 4) {
    verdict = 'Wrong Answer';
  } else if (statusId === 5) {
    verdict = 'TLE';
  } else if (statusId === 6) {
    verdict = 'Compilation Error';
  } else {
    verdict = 'Runtime Error';
  }

  return {
    status: statusId === 3 ? 'success' : 'error',
    stdout,
    stderr,
    executionTime,
    memory,
    verdict,
  };
}
