import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

interface ParamInfo {
  name: string;
  val: string;
}

/**
 * Extract parameter names and sample values from sample input string.
 * Example input: "nums = [2,7,11,15], target = 9"
 */
function parseSampleInputParams(sampleInput?: string): ParamInfo[] {
  if (!sampleInput || typeof sampleInput !== 'string') return [];
  const params: ParamInfo[] = [];
  const regex = /(?:^|,\s*|\n)\s*([a-zA-Z0-9_]+)\s*=\s*('[^']*'|"[^"]*"|\[\[[\s\S]*?\]\]|\[[\s\S]*?\]|-?\d+\.?\d*|true|false|[a-zA-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sampleInput)) !== null) {
    params.push({ name: match[1], val: match[2].trim() });
  }
  return params;
}

/**
 * Extract parameters from function templates if sampleInput key-value pairs are absent.
 */
function extractParamsFromTemplates(codeTemplates?: any): ParamInfo[] {
  if (!codeTemplates) return [];

  // Try Python template
  const pyCode = typeof codeTemplates === 'object' ? (codeTemplates.python || codeTemplates.py) : '';
  if (typeof pyCode === 'string' && pyCode.length > 0) {
    const match = pyCode.match(/def\s+\w+\(\s*self\s*,\s*([^)]+)\)/);
    if (match && match[1]) {
      const paramParts = match[1].split(',');
      const params: ParamInfo[] = [];
      for (const part of paramParts) {
        const [name, typeHint] = part.split(':').map((s) => s.trim());
        if (name && name !== 'self') {
          let val = '';
          if (typeHint) {
            if (typeHint.includes('list[list[')) val = '[[]]';
            else if (typeHint.includes('list[')) val = '[]';
            else if (typeHint.includes('str')) val = '""';
            else if (typeHint.includes('bool')) val = 'true';
            else if (typeHint.includes('int') || typeHint.includes('float')) val = '0';
            else if (typeHint.includes('ListNode')) val = 'head';
            else if (typeHint.includes('TreeNode')) val = 'root';
          }
          params.push({ name, val });
        }
      }
      if (params.length > 0) return params;
    }
  }

  // Try JS template
  const jsCode = typeof codeTemplates === 'object' ? (codeTemplates.javascript || codeTemplates.js) : '';
  if (typeof jsCode === 'string' && jsCode.length > 0) {
    const match = jsCode.match(/function\s+\w+\(([^)]+)\)/) || jsCode.match(/var\s+\w+\s*=\s*function\(([^)]+)\)/);
    if (match && match[1]) {
      const paramNames = match[1].split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      if (paramNames.length > 0) {
        return paramNames.map((name) => ({ name, val: '' }));
      }
    }
  }

  return [];
}

/**
 * Infer human-readable description for a parameter based on name, sample value, topic tags, and problem title.
 * Enforces strict value inspection BEFORE topic/title fallbacks to prevent misclassifications.
 */
export function inferParamTypeDescription(
  name: string,
  val: string,
  topicTags: string[] = [],
  title: string = ''
): string {
  const nameLower = name.toLowerCase();
  const titleLower = title.toLowerCase();
  const topics = topicTags.map((t) => t.toLowerCase());

  // Strict word boundary check for tree/bst context
  const isTreeContext =
    topics.some((t) => t.includes('tree') || /\bbst\b/i.test(t)) ||
    /\b(tree|bst|node)\b/i.test(titleLower);

  const isListContext =
    topics.some((t) => t.includes('linked list')) ||
    /\blinked list\b/i.test(titleLower);

  // Special title overrides
  if (titleLower.includes('anagram') || titleLower.includes('word pattern')) {
    if (nameLower === 'strs' || nameLower === 'nums' || nameLower === 'words' || val.startsWith('[')) {
      return `array of strings \`${name}\``;
    }
  }

  // 1. Literal Value Structural Inspection (Highest Precedence)

  // 1a. String literal ("..." or '...')
  if (val.startsWith('"') || val.startsWith("'")) {
    return `string \`${name}\``;
  }

  // 1b. 2D Matrix / Grid ([[...]])
  if (val.startsWith('[[')) {
    if (val.includes('"') || val.includes("'") || titleLower.includes('board') || titleLower.includes('word')) {
      return `2D matrix of characters \`${name}\``;
    }
    return `2D integer matrix/grid \`${name}\``;
  }

  // 1c. 1D Array / Tree / List representation ([...])
  if (val.startsWith('[')) {
    if (val.includes('null')) {
      if (isTreeContext) {
        return `root pointer of a Binary Tree \`${name}\``;
      }
      if (['root', 'tree', 'root1', 'root2'].includes(nameLower)) {
        return `root node pointer \`${name}\``;
      }
      if (isListContext || ['head', 'l1', 'l2', 'list1', 'list2'].includes(nameLower)) {
        return `head node pointer of a Singly Linked List \`${name}\``;
      }
    }

    if (val.includes('"') || val.includes("'") || ['words', 'strs', 'names', 'tokens', 'patterns'].includes(nameLower)) {
      return `array of strings \`${name}\``;
    }

    if (['root', 'tree', 'root1', 'root2'].includes(nameLower)) {
      return isTreeContext
        ? `root pointer of a Binary Tree \`${name}\``
        : `root node pointer \`${name}\``;
    }

    if (['head', 'l1', 'l2', 'list1', 'list2', 'head1', 'head2'].includes(nameLower) && (isListContext || nameLower.startsWith('head') || nameLower.startsWith('l'))) {
      return `head node pointer of a Singly Linked List \`${name}\``;
    }

    if (val.includes('true') || val.includes('false')) {
      return `array of booleans \`${name}\``;
    }
    return `array of integers \`${name}\``;
  }

  // 1d. Boolean literal (true / false)
  if (val === 'true' || val === 'false') {
    return `boolean value \`${name}\``;
  }

  // 1e. Floating point number (e.g. 3.14)
  if (/^-?\d+\.\d+$/.test(val)) {
    return `floating-point number \`${name}\``;
  }

  // 1f. Integer scalar literal (e.g. 8, 0, 100, -5)
  if (/^-?\d+$/.test(val)) {
    return `integer \`${name}\``;
  }

  // 2. Variable Name & Contextual Fallbacks (When val is empty or non-literal)
  if (['root', 'tree', 'root1', 'root2'].includes(nameLower)) {
    return isTreeContext
      ? `root pointer of a Binary Tree \`${name}\``
      : `root node pointer \`${name}\``;
  }

  if (
    (nameLower === 'p' || nameLower === 'q') && isTreeContext && val !== '""' && val !== "''"
  ) {
    return `root pointer of a Binary Tree \`${name}\``;
  }

  if (
    ['l1', 'l2', 'head', 'list1', 'list2', 'head1', 'head2'].includes(nameLower) ||
    (isListContext && (nameLower.startsWith('head') || nameLower.startsWith('list')))
  ) {
    return `head node pointer of a Singly Linked List \`${name}\``;
  }

  if (['matrix', 'grid', 'board', 'mat'].includes(nameLower)) {
    if (titleLower.includes('board') || titleLower.includes('word')) {
      return `2D matrix of characters \`${name}\``;
    }
    return `2D integer matrix/grid \`${name}\``;
  }

  if (
    ['s', 't', 'str', 'string', 'word', 'pattern', 's1', 's2', 'p', 'q', 'haystack', 'needle', 'text', 'query', 'pref', 'suff'].includes(nameLower) ||
    topics.some((t) => t.includes('string'))
  ) {
    return `string \`${name}\``;
  }

  if (
    ['nums', 'arr', 'array', 'nums1', 'nums2', 'values', 'height', 'prices', 'costs', 'weights', 'tokens', 'intervals', 'candidates', 'stones', 'cards', 'digits', 'numbers'].includes(nameLower) ||
    topics.some((t) => t.includes('array'))
  ) {
    if (nameLower.includes('words') || nameLower.includes('strs') || nameLower.includes('names')) {
      return `array of strings \`${name}\``;
    }
    return `array of integers \`${name}\``;
  }

  if (nameLower.startsWith('is') || nameLower.startsWith('has')) {
    return `boolean value \`${name}\``;
  }

  if (
    ['n', 'k', 'target', 'targetsum', 'val', 'x', 'y', 'm', 'row', 'col', 'amount', 'total', 'sum', 'capacity', 'left', 'right', 'limit', 'threshold', 'divisor', 'dividend', 'sr', 'sc', 'color', 'radius', 'index'].includes(nameLower)
  ) {
    return `integer \`${name}\``;
  }

  return `parameter \`${name}\``;
}

/**
 * Generate specific, readable Input Format descriptions based on problem metadata.
 */
export function synthesizeInputFormat(
  title: string,
  statement: string,
  topicTags: string[],
  sampleInput?: string,
  codeTemplates?: any
): string {
  let parsedParams = parseSampleInputParams(sampleInput);

  if (parsedParams.length === 0) {
    parsedParams = extractParamsFromTemplates(codeTemplates);
  }

  if (parsedParams.length > 0) {
    const descs = parsedParams.map((p) => inferParamTypeDescription(p.name, p.val, topicTags, title));
    if (descs.length === 1) {
      return `A single input ${descs[0]}.`;
    }
    return `Function arguments consisting of: ${descs.join(', ')}.`;
  }

  const titleLower = title.toLowerCase();
  const topics = topicTags.map((t) => t.toLowerCase());

  if (topics.some((t) => t.includes('string')) || titleLower.includes('string') || titleLower.includes('word') || titleLower.includes('palindrome')) {
    return 'A single input string `s` (and optional target string/pattern parameters).';
  }
  if (topics.some((t) => t.includes('linked list')) || /\blinked list\b/i.test(titleLower)) {
    return 'Head node pointer of a Singly Linked List `head`.';
  }
  if (topics.some((t) => t.includes('tree') || /\bbst\b/i.test(t)) || /\b(tree|bst)\b/i.test(titleLower)) {
    return 'Root pointer of a Binary Tree `root`.';
  }
  if (topics.some((t) => t.includes('matrix')) || titleLower.includes('matrix') || titleLower.includes('grid')) {
    return '2D grid matrix parameter `matrix[m][n]`.';
  }
  if (topics.some((t) => t.includes('array')) || titleLower.includes('array') || titleLower.includes('sum') || titleLower.includes('subsets')) {
    return 'An integer array `nums` and optional target integer parameters.';
  }

  return `Function parameters appropriate for "${title}".`;
}

/**
 * Generate specific, readable Output Format descriptions based on problem metadata.
 * Completely eliminates generic placeholder fallback text.
 */
export function synthesizeOutputFormat(
  title: string,
  statement: string,
  topicTags: string[],
  sampleOutput?: string
): string {
  const cleanOutput = (sampleOutput || '').trim();
  const topics = topicTags.map((t) => t.toLowerCase());
  const titleLower = title.toLowerCase();
  const stmtLower = statement.toLowerCase();

  // 1. Database / SQL problems
  if (
    topics.some((t) => t.includes('database') || t.includes('sql')) ||
    titleLower.includes('salary') ||
    titleLower.includes('employee') ||
    titleLower.includes('customer') ||
    titleLower.includes('table') ||
    titleLower.includes('department') ||
    titleLower.includes('duplicate emails') ||
    titleLower.includes('game play analysis') ||
    titleLower.includes('not boring movies') ||
    titleLower.includes('classes with at least') ||
    titleLower.includes('human traffic') ||
    titleLower.includes('sales person') ||
    titleLower.includes('exchange seats')
  ) {
    return 'Return the result table matching the query specifications in any order.';
  }

  // 2. Shell / CLI / Text file problems
  if (
    topics.some((t) => t.includes('shell')) ||
    titleLower.includes('transpose file') ||
    titleLower.includes('tenth line') ||
    titleLower.includes('valid phone numbers') ||
    titleLower.includes('word frequency')
  ) {
    return 'Output the processed text content or lines as specified.';
  }

  // 3. Design / Data Structure class problems
  if (
    topics.some((t) => t.includes('design') || t.includes('data stream')) ||
    titleLower.startsWith('design ') ||
    titleLower.includes('cache') ||
    titleLower.includes('calendar') ||
    titleLower.includes('data structure') ||
    titleLower.includes('trie') ||
    titleLower.includes('stream') ||
    titleLower.includes('randomizedset')
  ) {
    return 'Return an array of results corresponding to each executed method call (or null for void methods).';
  }

  // 4. Sample Output Structural Inspection
  if (
    cleanOutput === 'true' ||
    cleanOutput === 'false' ||
    cleanOutput === 'True' ||
    cleanOutput === 'False'
  ) {
    return 'Return boolean `true` if the condition is satisfied; otherwise `false`.';
  }

  if (cleanOutput.startsWith('[[') || cleanOutput.startsWith('[ [')) {
    if (cleanOutput.includes('"') || cleanOutput.includes("'")) {
      return 'Return a 2D matrix of strings/characters as specified.';
    }
    return 'Return a 2D array / list of lists containing the resulting elements.';
  }

  if (cleanOutput.startsWith('[') && cleanOutput.endsWith(']')) {
    if (topics.some((t) => t.includes('linked list')) || /\blinked list\b/i.test(titleLower)) {
      return 'Return the head node pointer of the modified Linked List.';
    }
    if (cleanOutput.includes('"') || cleanOutput.includes("'")) {
      return 'Return an array of strings representing the result.';
    }
    return 'Return an array / list containing the result elements.';
  }

  if ((cleanOutput.startsWith('"') && cleanOutput.endsWith('"')) || (cleanOutput.startsWith("'") && cleanOutput.endsWith("'"))) {
    return 'Return a string representing the calculated result.';
  }

  if (/^-?\d+\.\d+$/.test(cleanOutput)) {
    return 'Return a double/float number accurate within 10^-5 precision.';
  }

  if (/^-?\d+$/.test(cleanOutput)) {
    if (
      titleLower.includes('count') ||
      titleLower.includes('number of') ||
      titleLower.includes('length') ||
      titleLower.includes('max') ||
      titleLower.includes('min') ||
      titleLower.includes('size') ||
      titleLower.includes('sum') ||
      titleLower.includes('index') ||
      titleLower.includes('kth') ||
      titleLower.includes('search') ||
      titleLower.includes('find')
    ) {
      return 'Return an integer representing the requested count or maximum/minimum value.';
    }
    return 'Return a single integer representing the calculated value.';
  }

  // 5. Semantic Check on Title & Statement
  if (
    titleLower.startsWith('is ') ||
    titleLower.startsWith('can ') ||
    titleLower.startsWith('valid ') ||
    titleLower.includes('palindrome') ||
    titleLower.includes('same') ||
    titleLower.includes('contains') ||
    titleLower.includes('subsequence') ||
    titleLower.includes('exist') ||
    stmtLower.includes('return true') ||
    stmtLower.includes('return false') ||
    stmtLower.includes('`true`') ||
    stmtLower.includes('`false`')
  ) {
    return 'Return boolean `true` if the condition is satisfied; otherwise `false`.';
  }

  if (topics.some((t) => t.includes('linked list')) || /\blinked list\b/i.test(titleLower)) {
    if (titleLower.includes('intersection') || titleLower.includes('middle') || titleLower.includes('cycle')) {
      return 'Return the target node pointer of the Linked List (or null).';
    }
    return 'Return the head node pointer of the resulting Singly Linked List.';
  }

  if (topics.some((t) => t.includes('tree') || /\bbst\b/i.test(t)) || /\b(tree|bst)\b/i.test(titleLower)) {
    if (titleLower.includes('substring with concatenation of all words')) {
      return 'Return an array / list containing the starting indices of all matching substrings.';
    }
    if (
      titleLower.includes('count') ||
      titleLower.includes('depth') ||
      titleLower.includes('height') ||
      titleLower.includes('sum') ||
      titleLower.includes('diameter') ||
      titleLower.includes('path sum') ||
      titleLower.includes('kth') ||
      titleLower.includes('ancestor') ||
      titleLower.includes('mode')
    ) {
      return 'Return an integer representing the requested tree property/metric.';
    }
    return 'Return the root node pointer of the resulting Binary Tree.';
  }

  if (
    topics.some((t) => t.includes('string')) ||
    titleLower.includes('string') ||
    titleLower.includes('word') ||
    titleLower.includes('roman') ||
    titleLower.includes('path') ||
    titleLower.includes('decode') ||
    titleLower.includes('encode') ||
    titleLower.includes('anagram')
  ) {
    if (titleLower.includes('substring with concatenation of all words')) {
      return 'Return an array / list containing the starting indices of all matching substrings.';
    }
    if (
      titleLower.includes('count') ||
      titleLower.includes('length') ||
      titleLower.includes('number') ||
      titleLower.includes('index') ||
      titleLower.includes('first unique')
    ) {
      return 'Return an integer representing the character index, count, or length.';
    }
    if (titleLower.includes('anagrams') || titleLower.includes('subsets') || titleLower.includes('group')) {
      return 'Return a list of strings or list of string groups as the result.';
    }
    return 'Return a string representing the calculated result.';
  }

  if (
    topics.some((t) => t.includes('array') || t.includes('matrix') || t.includes('math') || t.includes('dynamic programming')) ||
    titleLower.includes('array') ||
    titleLower.includes('matrix') ||
    titleLower.includes('sum') ||
    titleLower.includes('number') ||
    titleLower.includes('element') ||
    titleLower.includes('game') ||
    titleLower.includes('circle') ||
    titleLower.includes('point') ||
    titleLower.includes('pick') ||
    titleLower.includes('fill') ||
    titleLower.includes('regions')
  ) {
    if (titleLower.includes('matrix') || titleLower.includes('grid') || titleLower.includes('fill') || titleLower.includes('regions')) {
      return 'Return the modified 2D grid matrix / region.';
    }
    if (titleLower.includes('array') || titleLower.includes('subsets') || titleLower.includes('permutations') || titleLower.includes('combinations')) {
      return 'Return an array / list containing the result elements.';
    }
    return 'Return an integer representing the calculated value.';
  }

  return `Return the calculated result value formatted according to "${title}" problem specifications.`;
}

/**
 * Clean up markdown statement text.
 */
export function cleanStatementMarkdown(statement: string, slug?: string): string {
  let cleaned = statement
    // Remove invisible characters and normalize the HTML/text extraction artifacts
    // present in the imported problem statements.
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(示例|例子)\s*(\d+)\s*[:：]\*\*/g, '**Example $2:**')
    .replace(/\*\*(输入|输入内容)\s*[:：]?\s*\*\*/g, '**Input:**')
    .replace(/\*\*(输出|输出内容)\s*[:：]?\s*\*\*/g, '**Output:**')
    .replace(/\*\*(解释|说明)\s*[:：]?\s*\*\*/g, '**Explanation:**')
    .replace(/\*\*(Input|Output|Explanation)\s*:\s*\*\*/gi, (_match, label: string) => `**${label[0].toUpperCase()}${label.slice(1).toLowerCase()}:**`)
    .replace(/\*(Example\s+\d+|Input|Output|Explanation)\s*:\*/gi, (_match, label: string) => `**${label[0].toUpperCase()}${label.slice(1).toLowerCase()}:**`)
    .replace(/```(?:text|plaintext|markdown)?\s*/gi, '')
    .replace(/\s*```/g, '')
    .replace(/```\s*\n\s*\*\*Input:\*\*/g, '**Input:**')
    .replace(/```\s*\n\s*\*\*Output:\*\*/g, '**Output:**')
    .replace(/```\s*\n\s*\*\*Explanation:\*\*/g, '**Explanation:**')
    .replace(/```\s*\n\s*Explanation:/g, '**Explanation:**')
    .replace(/(?<!\*\*)\bExplanation:\s*/g, '**Explanation:** ')
    .replace(/```\s*$/g, '')
    .replace(/```\s*\n\s*(\*\*Example \d+:\*\*)/g, '$1')
    .replace(/\n\t+[-*]\s*/g, '\n- ')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<\/?(?:div|span|br|li|ul|ol|strong|em|a)(?:\s[^>]*)?>/gi, '')
    .replace(/<code>/g, '`')
    .replace(/<\/code>/g, '`')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/`-`\s*(\d+)/g, '-$1')
    .replace(/\*{3,}/g, '**')
    // The source contains a mix of valid bold and invalid single-star emphasis.
    // Keep bold markers and remove only single-star wrappers.
    .replace(/\*\*([^*\n]+)\*\*/g, '**$1**')
    .replace(/\*([^*\n]+)\*/g, '$1')
    // Re-apply semantic labels after stripping malformed single-star emphasis.
    .replace(/(^|\n)(Example\s+\d+|Input|Output|Explanation)\s*:(?=\s|$)/gim, (_match, prefix: string, label: string) => `${prefix}**${label[0].toUpperCase()}${label.slice(1).toLowerCase()}:**`)
    .replace(/(?<!\*)\*(?!\*)/g, '')
    .replace(/\t+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const normalizedBySlug: Record<string, string> = {
    // These two records were imported from a localized mirror and had no reliable
    // English statement to clean in place.
    'longest-substring-without-repeating-characters': [
      'Given a string `s`, find the length of the longest substring without repeating characters.',
      '',
      '**Example 1:**',
      '**Input:** s = "abcabcbb"',
      '**Output:** 3',
      '**Explanation:** The answer is "abc", with a length of 3.',
      '',
      '**Example 2:**',
      '**Input:** s = "bbbbb"',
      '**Output:** 1',
      '',
      '**Example 3:**',
      '**Input:** s = "pwwkew"',
      '**Output:** 3',
      '**Explanation:** The answer is "wke", with a length of 3.',
    ].join('\n'),
    'search-in-rotated-sorted-array': [
      'You are given an integer array `nums` sorted in ascending order with distinct values.',
      '',
      'Before it is passed to your function, `nums` is rotated at an unknown pivot index `k` so that the resulting array is `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]`.',
      '',
      'Given the rotated array and an integer `target`, return the index of `target` if it is present. Otherwise, return `-1`.',
      '',
      'You must write an algorithm with `O(log n)` runtime complexity.',
      '',
      '**Example 1:**',
      '**Input:** nums = [4,5,6,7,0,1,2], target = 0',
      '**Output:** 4',
      '',
      '**Example 2:**',
      '**Input:** nums = [4,5,6,7,0,1,2], target = 3',
      '**Output:** -1',
      '',
      '**Example 3:**',
      '**Input:** nums = [1], target = 0',
      '**Output:** -1',
    ].join('\n'),
    'sum-of-two-integers': [
      'Given two integers `a` and `b`, return their sum without using the `+` or `-` operators.',
      '',
      '**Example 1:**',
      '**Input:** a = 1, b = 2',
      '**Output:** 3',
      '',
      '**Example 2:**',
      '**Input:** a = 2, b = 3',
      '**Output:** 5',
    ].join('\n'),
  };

  const overrideKey = slug && normalizedBySlug[slug] ? slug : undefined;
  if (overrideKey) cleaned = normalizedBySlug[overrideKey];

  return cleaned;
}

/**
 * Clean up markdown constraints text.
 */
export function cleanConstraintsMarkdown(constraints: string | null | undefined, statement: string): string {
  let text = constraints;

  if (!text || text.trim().length === 0) {
    const match = statement.match(/\*\*Constraints:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*|\n\*\*|$)/);
    if (match && match[1].trim().length > 0) {
      text = match[1].trim();
    } else {
      return '- See problem statement for input boundaries.';
    }
  }

  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n\t+[-*]\s*/g, '\n- ')
    .replace(/^\t+[-*]\s*/gm, '- ')
    .replace(/\n\s{4,}[-*]\s*/g, '\n- ')
    .replace(/^\*\s+/gm, '- ')
    .replace(/(?<!`)(10\^\d+|2\^31\s*-\s*1)(?!`)/g, '`$1`')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned.startsWith('- ') && !cleaned.startsWith('* ')) {
    cleaned = `- ${cleaned}`;
  }

  return cleaned;
}

async function refineAllProblems() {
  console.log('🚀 Starting comprehensive problem description refinement across the canonical problem catalog...');

  const problems = await prisma.problem.findMany({
    include: {
      testCases: true,
      codeTemplates: true,
    },
  });

  console.log(`Loaded ${problems.length} problems from database.`);

  const problemMap = new Map<string, { statement: string; inputFormat: string; outputFormat: string; constraints: string; slug: string }>();
  const updates: Array<{ id: string; data: { statement: string; constraints: string; inputFormat: string; outputFormat: string } }> = [];

  for (const p of problems) {
    const topicTagsArr: string[] = JSON.parse(p.topicTags || '[]');
    const sampleTC = p.testCases.find((t) => t.isSample) || p.testCases[0];

    const templatesMap: Record<string, string> = {};
    for (const t of p.codeTemplates) {
      templatesMap[t.language] = t.code;
    }

    const cleanedStatement = cleanStatementMarkdown(p.statement, p.slug);
    const cleanedConstraints = cleanConstraintsMarkdown(p.constraints, p.statement);
    const newInputFormat = synthesizeInputFormat(p.title, p.statement, topicTagsArr, sampleTC?.input, templatesMap);
    const newOutputFormat = synthesizeOutputFormat(p.title, p.statement, topicTagsArr, sampleTC?.expectedOutput);

    problemMap.set(p.title, {
      statement: cleanedStatement,
      inputFormat: newInputFormat,
      outputFormat: newOutputFormat,
      constraints: cleanedConstraints,
      slug: p.slug,
    });
    problemMap.set(p.slug, {
      statement: cleanedStatement,
      inputFormat: newInputFormat,
      outputFormat: newOutputFormat,
      constraints: cleanedConstraints,
      slug: p.slug,
    });

    if (
      cleanedStatement !== p.statement ||
      cleanedConstraints !== p.constraints ||
      newInputFormat !== p.inputFormat ||
      newOutputFormat !== p.outputFormat
    ) {
      updates.push({
        id: p.id,
        data: {
          statement: cleanedStatement,
          constraints: cleanedConstraints,
          inputFormat: newInputFormat,
          outputFormat: newOutputFormat,
        },
      });
    }
  }

  console.log(`Prepared ${updates.length} problem updates. Executing database updates in transaction batches...`);

  // Send bounded batches through one transaction so remote Postgres latency does
  // not turn 600 small updates into a multi-minute migration.
  const BATCH_SIZE = 100;
  let updatedCount = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      async (tx) => {
        await Promise.all(chunk.map((item) => tx.problem.update({
          where: { id: item.id },
          data: item.data,
        })));
      },
      { timeout: 120_000 },
    );
    updatedCount += chunk.length;
    console.log(`   Updated ${updatedCount}/${updates.length} problem DB records...`);
  }

  console.log(`✅ Successfully updated ${updatedCount} problem records in PostgreSQL database!`);

  const boilerplateInputCount = await prisma.problem.count({
    where: { inputFormat: { contains: 'Input provided according to problem parameters' } },
  });
  const boilerplateOutputCount = await prisma.problem.count({
    where: { outputFormat: { contains: 'Expected output according to problem specifications' } },
  });

  console.log(`📊 DB Verification: Boilerplate input formats remaining = ${boilerplateInputCount}`);
  console.log(`📊 DB Verification: Boilerplate output formats remaining = ${boilerplateOutputCount}`);

  // Synchronize leetcode400.json
  const leetcode400Path = path.join(__dirname, '..', 'prisma', 'seedData', 'leetcode400.json');
  if (fs.existsSync(leetcode400Path)) {
    console.log('🔄 Synchronizing leetcode400.json...');
    const seedArray = JSON.parse(fs.readFileSync(leetcode400Path, 'utf-8'));
    let syncedCount = 0;

    for (const item of seedArray) {
      const refined = problemMap.get(item.title) || problemMap.get(item.slug);
      if (refined) {
        item.statement = refined.statement;
        item.inputFormat = refined.inputFormat;
        item.outputFormat = refined.outputFormat;
        item.constraints = refined.constraints;
        syncedCount++;
      }
    }

    fs.writeFileSync(leetcode400Path, JSON.stringify(seedArray, null, 2), 'utf-8');
    console.log(`✅ Synchronized ${syncedCount}/${seedArray.length} entries in leetcode400.json.`);
  }

  // Synchronize freemodel-question-corpus.jsonl
  const corpusPath = path.join(__dirname, '..', 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
  if (fs.existsSync(corpusPath)) {
    console.log('🔄 Synchronizing freemodel-question-corpus.jsonl...');
    const lines = fs.readFileSync(corpusPath, 'utf-8').split('\n').filter((l) => l.trim().length > 0);
    const updatedLines: string[] = [];
    let syncedCorpusCount = 0;

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const title = obj.canonical?.title || obj.metadata?.title || obj.slug;
        const slug = obj.metadata?.slug || obj.slug;
        const refined = problemMap.get(title) || problemMap.get(slug);

        if (refined) {
          if (obj.canonical) {
            obj.canonical.statement = refined.statement;
            obj.canonical.inputFormat = refined.inputFormat;
            obj.canonical.outputFormat = refined.outputFormat;
            obj.canonical.constraints = refined.constraints;

            if (Array.isArray(obj.canonical.samples)) {
              for (const sample of obj.canonical.samples) {
                if (typeof sample.expectedOutput === 'string') {
                  sample.expectedOutput = sample.expectedOutput.replace(/(?<!\*\*)\bExplanation:\s*/g, '**Explanation:** ');
                }
                if (typeof sample.explanation === 'string') {
                  sample.explanation = sample.explanation.replace(/(?<!\*\*)\bExplanation:\s*/g, '**Explanation:** ');
                }
              }
            }
          }

          if (obj.messages && obj.messages[1] && typeof obj.messages[1].content === 'string') {
            let content: string = obj.messages[1].content;
            
            content = content.replace(/(Statement:\n)([\s\S]*?)(\n\nInput format:)/, `$1${refined.statement}$3`);
            content = content.replace(/(Input format:\n)([\s\S]*?)(\n\nOutput format:)/, `$1${refined.inputFormat}$3`);
            content = content.replace(/(Output format:\n)([\s\S]*?)(\n\nConstraints:)/, `$1${refined.outputFormat}$3`);
            content = content.replace(/(Constraints:\n)([\s\S]*?)(\n\nSample cases:)/, `$1${refined.constraints}$3`);

            content = content.replace(/(?<!\*\*)\bExplanation:\s*/g, '**Explanation:** ');

            obj.messages[1].content = content;
          }
          syncedCorpusCount++;
        }

        updatedLines.push(JSON.stringify(obj));
      } catch (e) {
        updatedLines.push(line);
      }
    }

    fs.writeFileSync(corpusPath, updatedLines.join('\n') + '\n', 'utf-8');
    console.log(`✅ Synchronized ${syncedCorpusCount}/${lines.length} entries in freemodel-question-corpus.jsonl.`);
  }
}

if (require.main === module || (process.argv[1] && process.argv[1].includes('refine-all-problem-descriptions'))) {
  refineAllProblems()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
