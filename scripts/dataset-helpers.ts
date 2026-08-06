import fs from 'fs';
import path from 'path';

export interface TestCaseSeed {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  explanation?: string;
}

export interface CodeTemplatesSeed {
  python: string;
  cpp: string;
  javascript: string;
  java: string;
  go: string;
}

export interface ProblemSeedData {
  id: string;
  frontendId: number;
  title: string;
  slug: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topicTags: string[];
  companyTags: string[];
  editorial: string;
  timeLimit: number;
  memoryLimit: number;
  testCases: TestCaseSeed[];
  codeTemplates: CodeTemplatesSeed;
}

// ---------------------------------------------------------------------------
// 1. NeetCode 150 Topic Mapping Taxonomy & Canonical Lookups
// ---------------------------------------------------------------------------

export const NEETCODE_CATEGORIES = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Linked List',
  'Trees',
  'Tries',
  'Heap / Priority Queue',
  'Backtracking',
  'Graphs',
  'Advanced Graphs',
  '1D Dynamic Programming',
  '2D Dynamic Programming',
  'Greedy',
  'Intervals',
  'Math & Geometry',
  'Bit Manipulation',
] as const;

export type NeetCodeCategory = typeof NEETCODE_CATEGORIES[number];

const CANONICAL_SLUG_MAP: Record<string, NeetCodeCategory> = {
  'two-sum': 'Arrays & Hashing',
  'valid-anagram': 'Arrays & Hashing',
  'contains-duplicate': 'Arrays & Hashing',
  'group-anagrams': 'Arrays & Hashing',
  'top-k-frequent-elements': 'Arrays & Hashing',
  'product-of-array-except-self': 'Arrays & Hashing',
  'valid-sudoku': 'Arrays & Hashing',
  'encode-and-decode-strings': 'Arrays & Hashing',
  'longest-consecutive-sequence': 'Arrays & Hashing',

  'valid-palindrome': 'Two Pointers',
  'two-sum-ii-input-array-is-sorted': 'Two Pointers',
  '3sum': 'Two Pointers',
  'container-with-most-water': 'Two Pointers',
  'trapping-rain-water': 'Two Pointers',

  'best-time-to-buy-and-sell-stock': 'Sliding Window',
  'longest-substring-without-repeating-characters': 'Sliding Window',
  'longest-repeating-character-replacement': 'Sliding Window',
  'permutation-in-string': 'Sliding Window',
  'minimum-window-substring': 'Sliding Window',
  'sliding-window-maximum': 'Sliding Window',

  'valid-parentheses': 'Stack',
  'min-stack': 'Stack',
  'evaluate-reverse-polish-notation': 'Stack',
  'generate-parentheses': 'Stack',
  'daily-temperatures': 'Stack',
  'car-fleet': 'Stack',
  'largest-rectangle-in-histogram': 'Stack',

  'binary-search': 'Binary Search',
  'search-a-2d-matrix': 'Binary Search',
  'koko-eating-bananas': 'Binary Search',
  'find-minimum-in-rotated-sorted-array': 'Binary Search',
  'search-in-rotated-sorted-array': 'Binary Search',
  'time-based-key-value-store': 'Binary Search',
  'median-of-two-sorted-arrays': 'Binary Search',

  'reverse-linked-list': 'Linked List',
  'merge-two-sorted-lists': 'Linked List',
  'reorder-list': 'Linked List',
  'remove-nth-node-from-end-of-list': 'Linked List',
  'copy-list-with-random-pointer': 'Linked List',
  'add-two-numbers': 'Linked List',
  'linked-list-cycle': 'Linked List',
  'find-the-duplicate-number': 'Linked List',
  'lru-cache': 'Linked List',
  'merge-k-sorted-lists': 'Linked List',
  'reverse-nodes-in-k-group': 'Linked List',

  'invert-binary-tree': 'Trees',
  'maximum-depth-of-binary-tree': 'Trees',
  'diameter-of-binary-tree': 'Trees',
  'balanced-binary-tree': 'Trees',
  'same-tree': 'Trees',
  'subtree-of-another-tree': 'Trees',
  'lowest-common-ancestor-of-a-binary-search-tree': 'Trees',
  'binary-tree-level-order-traversal': 'Trees',
  'binary-tree-right-side-view': 'Trees',
  'count-good-nodes-in-binary-tree': 'Trees',
  'validate-binary-search-tree': 'Trees',
  'kth-smallest-element-in-a-bst': 'Trees',
  'construct-binary-tree-from-preorder-and-inorder-traversal': 'Trees',
  'binary-tree-maximum-path-sum': 'Trees',
  'serialize-and-deserialize-binary-tree': 'Trees',

  'implement-trie-prefix-tree': 'Tries',
  'design-add-and-search-words-data-structure': 'Tries',
  'word-search-ii': 'Tries',

  'kth-largest-element-in-a-stream': 'Heap / Priority Queue',
  'last-stone-weight': 'Heap / Priority Queue',
  'k-closest-points-to-origin': 'Heap / Priority Queue',
  'kth-largest-element-in-an-array': 'Heap / Priority Queue',
  'task-scheduler': 'Heap / Priority Queue',
  'design-twitter': 'Heap / Priority Queue',
  'find-median-from-data-stream': 'Heap / Priority Queue',

  'subsets': 'Backtracking',
  'combination-sum': 'Backtracking',
  'permutations': 'Backtracking',
  'subsets-ii': 'Backtracking',
  'combination-sum-ii': 'Backtracking',
  'word-search': 'Backtracking',
  'palindrome-partitioning': 'Backtracking',
  'letter-combinations-of-a-phone-number': 'Backtracking',
  'n-queens': 'Backtracking',

  'number-of-islands': 'Graphs',
  'max-area-of-island': 'Graphs',
  'clone-graph': 'Graphs',
  'walls-and-gates': 'Graphs',
  'rotting-oranges': 'Graphs',
  'pacific-atlantic-water-flow': 'Graphs',
  'surrounded-regions': 'Graphs',
  'course-schedule': 'Graphs',
  'course-schedule-ii': 'Graphs',
  'graph-valid-tree': 'Graphs',
  'number-of-connected-components-in-an-undirected-graph': 'Graphs',
  'redundant-connection': 'Graphs',
  'word-ladder': 'Graphs',

  'reconstruct-itinerary': 'Advanced Graphs',
  'min-cost-to-connect-all-points': 'Advanced Graphs',
  'network-delay-time': 'Advanced Graphs',
  'swim-in-rising-water': 'Advanced Graphs',
  'alien-dictionary': 'Advanced Graphs',
  'cheapest-flights-within-k-stops': 'Advanced Graphs',

  'climbing-stairs': '1D Dynamic Programming',
  'min-cost-climbing-stairs': '1D Dynamic Programming',
  'house-robber': '1D Dynamic Programming',
  'house-robber-ii': '1D Dynamic Programming',
  'longest-palindromic-substring': '1D Dynamic Programming',
  'palindromic-substrings': '1D Dynamic Programming',
  'decode-ways': '1D Dynamic Programming',
  'coin-change': '1D Dynamic Programming',
  'maximum-product-subarray': '1D Dynamic Programming',
  'word-break': '1D Dynamic Programming',
  'longest-increasing-subsequence': '1D Dynamic Programming',
  'partition-equal-subset-sum': '1D Dynamic Programming',

  'unique-paths': '2D Dynamic Programming',
  'longest-common-subsequence': '2D Dynamic Programming',
  'best-time-to-buy-and-sell-stock-with-cooldown': '2D Dynamic Programming',
  'coin-change-ii': '2D Dynamic Programming',
  'target-sum': '2D Dynamic Programming',
  'interleaving-string': '2D Dynamic Programming',
  'longest-increasing-path-in-a-matrix': '2D Dynamic Programming',
  'distinct-subsequences': '2D Dynamic Programming',
  'edit-distance': '2D Dynamic Programming',
  'burst-balloons': '2D Dynamic Programming',
  'regular-expression-matching': '2D Dynamic Programming',

  'maximum-subarray': 'Greedy',
  'jump-game': 'Greedy',
  'jump-game-ii': 'Greedy',
  'gas-station': 'Greedy',
  'hand-of-straights': 'Greedy',
  'merge-triplets-to-form-target-array': 'Greedy',
  'partition-labels': 'Greedy',
  'valid-parenthesis-string': 'Greedy',

  'insert-interval': 'Intervals',
  'merge-intervals': 'Intervals',
  'non-overlapping-intervals': 'Intervals',
  'meeting-rooms': 'Intervals',
  'meeting-rooms-ii': 'Intervals',
  'minimum-interval-to-include-each-query': 'Intervals',

  'rotate-image': 'Math & Geometry',
  'spiral-matrix': 'Math & Geometry',
  'set-matrix-zeroes': 'Math & Geometry',
  'happy-number': 'Math & Geometry',
  'powx-n': 'Math & Geometry',
  'multiply-strings': 'Math & Geometry',
  'detect-squares': 'Math & Geometry',

  'single-number': 'Bit Manipulation',
  'number-of-1-bits': 'Bit Manipulation',
  'counting-bits': 'Bit Manipulation',
  'reverse-bits': 'Bit Manipulation',
  'missing-number': 'Bit Manipulation',
  'sum-of-two-integers': 'Bit Manipulation',
  'reverse-integer': 'Bit Manipulation',
};

export function resolveNeetCodeCategory(slug: string, rawTags: string[]): NeetCodeCategory {
  if (CANONICAL_SLUG_MAP[slug]) {
    return CANONICAL_SLUG_MAP[slug];
  }

  const tagsLower = rawTags.map((t) => t.toLowerCase());

  if (tagsLower.some((t) => t.includes('union find') || t.includes('trie') || t.includes('topological'))) {
    if (tagsLower.some((t) => t.includes('trie'))) return 'Tries';
    return 'Advanced Graphs';
  }
  if (tagsLower.some((t) => t.includes('interval'))) return 'Intervals';
  if (tagsLower.some((t) => t.includes('bit manipulation') || t.includes('bitmask'))) return 'Bit Manipulation';
  if (tagsLower.some((t) => t.includes('stack') || t.includes('monotonic stack'))) return 'Stack';
  if (tagsLower.some((t) => t.includes('sliding window'))) return 'Sliding Window';
  if (tagsLower.some((t) => t.includes('binary search'))) return 'Binary Search';
  if (tagsLower.some((t) => t.includes('heap') || t.includes('priority queue'))) return 'Heap / Priority Queue';
  if (tagsLower.some((t) => t.includes('backtracking'))) return 'Backtracking';
  if (tagsLower.some((t) => t.includes('linked list'))) return 'Linked List';
  if (tagsLower.some((t) => t.includes('tree') || t.includes('binary tree') || t.includes('bst'))) return 'Trees';
  if (tagsLower.some((t) => t.includes('graph') || t.includes('breadth-first') || t.includes('depth-first'))) return 'Graphs';
  if (tagsLower.some((t) => t.includes('dynamic programming') || t.includes('dp'))) {
    if (tagsLower.some((t) => t.includes('matrix') || t.includes('grid') || t.includes('2d'))) {
      return '2D Dynamic Programming';
    }
    return '1D Dynamic Programming';
  }
  if (tagsLower.some((t) => t.includes('greedy'))) return 'Greedy';
  if (tagsLower.some((t) => t.includes('two pointers'))) return 'Two Pointers';
  if (tagsLower.some((t) => t.includes('math') || t.includes('geometry') || t.includes('matrix'))) return 'Math & Geometry';

  return 'Arrays & Hashing';
}

// ---------------------------------------------------------------------------
// 2. Company Tagging Matrix
// ---------------------------------------------------------------------------

export const COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Uber', 'Flipkart'] as const;

export function getCompanyTagsForProblem(frontendId: number, slug: string, category: NeetCodeCategory): string[] {
  const companyPool = [...COMPANIES];
  // Deterministic selection based on ID hash
  const count = (frontendId % 4) + 2; // 2 to 5 companies
  const assigned: string[] = [];

  // Category specific biases
  if (category === 'Advanced Graphs' || category === 'Math & Geometry') {
    assigned.push('Google');
  }
  if (category === 'Heap / Priority Queue' || category === 'Trees' || category === 'Intervals') {
    assigned.push('Amazon');
  }
  if (category === 'Linked List' || category === 'Stack') {
    assigned.push('Microsoft');
  }
  if (category === 'Two Pointers' || category === 'Sliding Window' || category === 'Backtracking') {
    assigned.push('Meta');
  }
  if (category === 'Bit Manipulation' || category === 'Arrays & Hashing') {
    assigned.push('Apple');
  }
  if (category === '1D Dynamic Programming' || category === '2D Dynamic Programming') {
    assigned.push('Flipkart');
  }

  let index = frontendId;
  while (assigned.length < count) {
    const candidate = companyPool[index % companyPool.length];
    if (!assigned.includes(candidate)) {
      assigned.push(candidate);
    }
    index += 3;
  }

  return assigned;
}

// ---------------------------------------------------------------------------
// 3. Multi-Language Starter Code Generator (5 Languages)
// ---------------------------------------------------------------------------

export interface FunctionSignature {
  functionName: string;
  returnType: string; // 'int', 'bool', 'string', 'int[]', 'string[]', 'ListNode', 'TreeNode', 'int[][]'
  params: { name: string; type: string }[];
}

export function parseSignatureFromTitleAndSlug(title: string, slug: string): FunctionSignature {
  // Convert camelCase or kebab-case slug to function name
  const parts = slug.split('-').filter(Boolean);
  const functionName = parts.length > 0
    ? parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
    : 'solve';

  const slugLower = slug.toLowerCase();

  // Infer return type and parameters based on common problem patterns
  let returnType = 'int';
  let params: { name: string; type: string }[] = [{ name: 'nums', type: 'int[]' }];

  if (slugLower.includes('two-sum') || slugLower.includes('3sum') || slugLower.includes('4sum')) {
    returnType = 'int[]';
    params = [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }];
  } else if (slugLower.includes('valid') || slugLower.includes('is-') || slugLower.includes('has-') || slugLower.includes('exist') || slugLower.includes('same-') || slugLower.includes('subtree')) {
    returnType = 'bool';
    if (slugLower.includes('anagram') || slugLower.includes('palindrome') || slugLower.includes('parentheses')) {
      params = [{ name: 's', type: 'string' }];
      if (slugLower.includes('anagram')) params.push({ name: 't', type: 'string' });
    } else if (slugLower.includes('sudoku') || slugLower.includes('matrix')) {
      params = [{ name: 'board', type: 'char[][]' }];
    }
  } else if (slugLower.includes('string') || slugLower.includes('substring') || slugLower.includes('encode') || slugLower.includes('decode')) {
    if (slugLower.includes('length') || slugLower.includes('count')) {
      returnType = 'int';
      params = [{ name: 's', type: 'string' }];
    } else {
      returnType = 'string';
      params = [{ name: 's', type: 'string' }];
    }
  } else if (slugLower.includes('linked-list') || slugLower.includes('list-node') || slugLower.includes('reverse-list') || slugLower.includes('merge-two-sorted-lists')) {
    returnType = 'ListNode';
    params = [{ name: 'head', type: 'ListNode' }];
    if (slugLower.includes('merge')) {
      params = [{ name: 'list1', type: 'ListNode' }, { name: 'list2', type: 'ListNode' }];
    }
  } else if (slugLower.includes('tree') || slugLower.includes('invert-binary-tree') || slugLower.includes('bst')) {
    if (slugLower.includes('depth') || slugLower.includes('diameter') || slugLower.includes('count')) {
      returnType = 'int';
    } else if (slugLower.includes('is-') || slugLower.includes('balanced') || slugLower.includes('same')) {
      returnType = 'bool';
    } else {
      returnType = 'TreeNode';
    }
    params = [{ name: 'root', type: 'TreeNode' }];
  } else if (slugLower.includes('search') || slugLower.includes('find')) {
    returnType = 'int';
    params = [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }];
  } else if (slugLower.includes('matrix') || slugLower.includes('grid') || slugLower.includes('island')) {
    returnType = 'int';
    params = [{ name: 'grid', type: 'int[][]' }];
  }

  return { functionName, returnType, params };
}

export function generateCodeTemplates(sig: FunctionSignature): CodeTemplatesSeed {
  const { functionName, returnType, params } = sig;

  // --- Python Template ---
  const pythonParamString = params.map((p) => {
    let t = 'int';
    if (p.type === 'int[]') t = 'list[int]';
    else if (p.type === 'string') t = 'str';
    else if (p.type === 'string[]') t = 'list[str]';
    else if (p.type === 'bool') t = 'bool';
    else if (p.type === 'ListNode') t = 'Optional[ListNode]';
    else if (p.type === 'TreeNode') t = 'Optional[TreeNode]';
    else if (p.type === 'int[][]') t = 'list[list[int]]';
    else if (p.type === 'char[][]') t = 'list[list[str]]';
    return `${p.name}: ${t}`;
  }).join(', ');

  let pythonReturnType = 'int';
  if (returnType === 'int[]') pythonReturnType = 'list[int]';
  else if (returnType === 'string') pythonReturnType = 'str';
  else if (returnType === 'string[]') pythonReturnType = 'list[str]';
  else if (returnType === 'bool') pythonReturnType = 'bool';
  else if (returnType === 'ListNode') pythonReturnType = 'Optional[ListNode]';
  else if (returnType === 'TreeNode') pythonReturnType = 'Optional[TreeNode]';
  else if (returnType === 'int[][]') pythonReturnType = 'list[list[int]]';

  let pythonHeader = '';
  if (params.some((p) => p.type === 'ListNode') || returnType === 'ListNode') {
    pythonHeader += `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\n`;
  }
  if (params.some((p) => p.type === 'TreeNode') || returnType === 'TreeNode') {
    pythonHeader += `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n`;
  }

  const python = `${pythonHeader}class Solution:\n    def ${functionName}(self, ${pythonParamString}) -> ${pythonReturnType}:\n        # Write your solution here\n        pass\n`;

  // --- C++ Template ---
  const cppParamString = params.map((p) => {
    if (p.type === 'int[]') return `std::vector<int>& ${p.name}`;
    if (p.type === 'string') return `std::string ${p.name}`;
    if (p.type === 'string[]') return `std::vector<std::string>& ${p.name}`;
    if (p.type === 'bool') return `bool ${p.name}`;
    if (p.type === 'ListNode') return `ListNode* ${p.name}`;
    if (p.type === 'TreeNode') return `TreeNode* ${p.name}`;
    if (p.type === 'int[][]') return `std::vector<std::vector<int>>& ${p.name}`;
    if (p.type === 'char[][]') return `std::vector<std::vector<char>>& ${p.name}`;
    return `int ${p.name}`;
  }).join(', ');

  let cppReturnType = 'int';
  let cppDefaultReturn = '0';
  if (returnType === 'int[]') { cppReturnType = 'std::vector<int>'; cppDefaultReturn = '{}'; }
  else if (returnType === 'string') { cppReturnType = 'std::string'; cppDefaultReturn = '""'; }
  else if (returnType === 'string[]') { cppReturnType = 'std::vector<std::string>'; cppDefaultReturn = '{}'; }
  else if (returnType === 'bool') { cppReturnType = 'bool'; cppDefaultReturn = 'false'; }
  else if (returnType === 'ListNode') { cppReturnType = 'ListNode*'; cppDefaultReturn = 'nullptr'; }
  else if (returnType === 'TreeNode') { cppReturnType = 'TreeNode*'; cppDefaultReturn = 'nullptr'; }
  else if (returnType === 'int[][]') { cppReturnType = 'std::vector<std::vector<int>>'; cppDefaultReturn = '{}'; }

  let cppHeader = `#include <iostream>\n#include <vector>\n#include <string>\n#include <unordered_map>\n#include <algorithm>\n\n`;
  if (params.some((p) => p.type === 'ListNode') || returnType === 'ListNode') {
    cppHeader += `struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode(int x) : val(x), next(nullptr) {}\n};\n\n`;
  }
  if (params.some((p) => p.type === 'TreeNode') || returnType === 'TreeNode') {
    cppHeader += `struct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n};\n\n`;
  }

  const cpp = `${cppHeader}class Solution {\npublic:\n    ${cppReturnType} ${functionName}(${cppParamString}) {\n        // Write your solution here\n        return ${cppDefaultReturn};\n    }\n};\n`;

  // --- JavaScript Template ---
  const jsDocParams = params.map((p) => {
    let t = 'number';
    if (p.type === 'int[]') t = 'number[]';
    else if (p.type === 'string') t = 'string';
    else if (p.type === 'string[]') t = 'string[]';
    else if (p.type === 'bool') t = 'boolean';
    else if (p.type === 'ListNode') t = 'ListNode';
    else if (p.type === 'TreeNode') t = 'TreeNode';
    else if (p.type === 'int[][]') t = 'number[][]';
    else if (p.type === 'char[][]') t = 'string[][]';
    return ` * @param {${t}} ${p.name}`;
  }).join('\n');

  let jsDocReturn = 'number';
  if (returnType === 'int[]') jsDocReturn = 'number[]';
  else if (returnType === 'string') jsDocReturn = 'string';
  else if (returnType === 'string[]') jsDocReturn = 'string[]';
  else if (returnType === 'bool') jsDocReturn = 'boolean';
  else if (returnType === 'ListNode') jsDocReturn = 'ListNode';
  else if (returnType === 'TreeNode') jsDocReturn = 'TreeNode';
  else if (returnType === 'int[][]') jsDocReturn = 'number[][]';

  const jsParamString = params.map((p) => p.name).join(', ');

  let jsHeader = '';
  if (params.some((p) => p.type === 'ListNode') || returnType === 'ListNode') {
    jsHeader += `function ListNode(val, next) {\n    this.val = (val === undefined ? 0 : val);\n    this.next = (next === undefined ? null : next);\n}\n\n`;
  }
  if (params.some((p) => p.type === 'TreeNode') || returnType === 'TreeNode') {
    jsHeader += `function TreeNode(val, left, right) {\n    this.val = (val === undefined ? 0 : val);\n    this.left = (left === undefined ? null : left);\n    this.right = (right === undefined ? null : right);\n}\n\n`;
  }

  const javascript = `${jsHeader}/**\n${jsDocParams}\n * @return {${jsDocReturn}}\n */\nfunction ${functionName}(${jsParamString}) {\n  // Write your solution here\n}\n`;

  // --- Java Template ---
  const javaParamString = params.map((p) => {
    let t = 'int';
    if (p.type === 'int[]') t = 'int[]';
    else if (p.type === 'string') t = 'String';
    else if (p.type === 'string[]') t = 'String[]';
    else if (p.type === 'bool') t = 'boolean';
    else if (p.type === 'ListNode') t = 'ListNode';
    else if (p.type === 'TreeNode') t = 'TreeNode';
    else if (p.type === 'int[][]') t = 'int[][]';
    else if (p.type === 'char[][]') t = 'char[][]';
    return `${t} ${p.name}`;
  }).join(', ');

  let javaReturnType = 'int';
  let javaDefaultReturn = '0';
  if (returnType === 'int[]') { javaReturnType = 'int[]'; javaDefaultReturn = 'new int[]{}'; }
  else if (returnType === 'string') { javaReturnType = 'String'; javaDefaultReturn = '""'; }
  else if (returnType === 'string[]') { javaReturnType = 'String[]'; javaDefaultReturn = 'new String[]{}'; }
  else if (returnType === 'bool') { javaReturnType = 'boolean'; javaDefaultReturn = 'false'; }
  else if (returnType === 'ListNode') { javaReturnType = 'ListNode'; javaDefaultReturn = 'null'; }
  else if (returnType === 'TreeNode') { javaReturnType = 'TreeNode'; javaDefaultReturn = 'null'; }
  else if (returnType === 'int[][]') { javaReturnType = 'int[][]'; javaDefaultReturn = 'new int[][]{}'; }

  let javaHeader = `import java.util.*;\n\n`;
  if (params.some((p) => p.type === 'ListNode') || returnType === 'ListNode') {
    javaHeader += `class ListNode {\n    int val;\n    ListNode next;\n    ListNode(int val) { this.val = val; }\n}\n\n`;
  }
  if (params.some((p) => p.type === 'TreeNode') || returnType === 'TreeNode') {
    javaHeader += `class TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode(int val) { this.val = val; }\n}\n\n`;
  }

  const java = `${javaHeader}class Solution {\n    public ${javaReturnType} ${functionName}(${javaParamString}) {\n        // Write your solution here\n        return ${javaDefaultReturn};\n    }\n}\n`;

  // --- Go Template ---
  const goParamString = params.map((p) => {
    let t = 'int';
    if (p.type === 'int[]') t = '[]int';
    else if (p.type === 'string') t = 'string';
    else if (p.type === 'string[]') t = '[]string';
    else if (p.type === 'bool') t = 'bool';
    else if (p.type === 'ListNode') t = '*ListNode';
    else if (p.type === 'TreeNode') t = '*TreeNode';
    else if (p.type === 'int[][]') t = '[][]int';
    else if (p.type === 'char[][]') t = '[][]byte';
    return `${p.name} ${t}`;
  }).join(', ');

  let goReturnType = 'int';
  let goDefaultReturn = '0';
  if (returnType === 'int[]') { goReturnType = '[]int'; goDefaultReturn = '[]int{}'; }
  else if (returnType === 'string') { goReturnType = 'string'; goDefaultReturn = '""'; }
  else if (returnType === 'string[]') { goReturnType = '[]string'; goDefaultReturn = '[]string{}'; }
  else if (returnType === 'bool') { goReturnType = 'bool'; goDefaultReturn = 'false'; }
  else if (returnType === 'ListNode') { goReturnType = '*ListNode'; goDefaultReturn = 'nil'; }
  else if (returnType === 'TreeNode') { goReturnType = '*TreeNode'; goDefaultReturn = 'nil'; }
  else if (returnType === 'int[][]') { goReturnType = '[][]int'; goDefaultReturn = '[][]int{}'; }

  let goHeader = `package main\n\nimport (\n    "fmt"\n)\n\n`;
  if (params.some((p) => p.type === 'ListNode') || returnType === 'ListNode') {
    goHeader += `type ListNode struct {\n    Val  int\n    Next *ListNode\n}\n\n`;
  }
  if (params.some((p) => p.type === 'TreeNode') || returnType === 'TreeNode') {
    goHeader += `type TreeNode struct {\n    Val   int\n    Left  *TreeNode\n    Right *TreeNode\n}\n\n`;
  }

  const go = `${goHeader}func ${functionName}(${goParamString}) ${goReturnType} {\n    // Write your solution here\n    return ${goDefaultReturn}\n}\n`;

  return { python, cpp, javascript, java, go };
}

// ---------------------------------------------------------------------------
// 4. Test Case & Description Cleaners
// ---------------------------------------------------------------------------

export function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<sup>(.*?)<\/sup>/gi, '^$1')
    .replace(/<sub>(.*?)<\/sub>/gi, '_$1')
    .replace(/<ul>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<pre>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
