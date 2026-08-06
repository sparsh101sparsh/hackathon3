import { ProblemSeed } from './problemsPart1';

export const problemsPart3: ProblemSeed[] = [
  {
    title: "Binary Tree Inorder Traversal",
    slug: "binary-tree-inorder-traversal",
    statement: "Given the root of a binary tree represented as an array (level-order, with nulls for empty nodes), return the inorder traversal of its nodes' values.",
    inputFormat: "Single line of space-separated values (integers or 'null').",
    outputFormat: "Space-separated integers of inorder traversal.",
    constraints: "The number of nodes in the tree is in range [0, 100].\n-100 <= Node.val <= 100",
    difficulty: "EASY",
    topicTags: ["Trees", "Stack", "DFS"],
    companyTags: ["Google", "Amazon", "Microsoft"],
    editorial: "### Approach: Inorder DFS (Left -> Root -> Right)\nRecursively visit left subtree, process root node, visit right subtree.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(H) where H is tree height.",
    testCases: [
      { input: "1 null 2 3", expectedOutput: "1 3 2", isSample: true },
      { input: "", expectedOutput: "", isSample: true },
      { input: "1", expectedOutput: "1", isSample: true },
      { input: "1 2 3 4 5", expectedOutput: "4 2 5 1 3", isSample: false },
      { input: "3 1 2", expectedOutput: "1 3 2", isSample: false },
      { input: "5 4 null 3 null 2", expectedOutput: "2 3 4 5", isSample: false }
    ],
    codeTemplates: {
      python: `def inorderTraversal(root: list) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> inorderTraversal(std::vector<int>& root) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function inorderTraversal(root) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Validate Binary Search Tree",
    slug: "validate-binary-search-tree",
    statement: "Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n- The left subtree of a node contains only nodes with keys strictly less than the node's key.\n- The right subtree of a node contains only nodes with keys strictly greater than the node's key.\n- Both the left and right subtrees must also be binary search trees.",
    inputFormat: "Level-order binary tree array values (integers or 'null').",
    outputFormat: "`true` or `false`.",
    constraints: "The number of nodes in tree is in range [1, 10^4].\n-2^31 <= Node.val <= 2^31 - 1",
    difficulty: "MEDIUM",
    topicTags: ["Trees", "BST", "DFS"],
    companyTags: ["Amazon", "Meta", "Google", "Microsoft"],
    editorial: "### Approach: Range Validation (min, max)\nRecursively validate that each node value is strictly bounded between `(low, high)`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(H)",
    testCases: [
      { input: "2 1 3", expectedOutput: "true", isSample: true },
      { input: "5 1 4 null null 3 6", expectedOutput: "false", isSample: true, explanation: "The root node's value is 5 but its right child's value is 4." },
      { input: "10 5 15 null null 6 20", expectedOutput: "false", isSample: false },
      { input: "1", expectedOutput: "true", isSample: false },
      { input: "3 2 4 1 null null 5", expectedOutput: "true", isSample: false },
      { input: "2 2 2", expectedOutput: "false", isSample: false }
    ],
    codeTemplates: {
      python: `def isValidBST(root: list) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nbool isValidBST(std::vector<int>& root) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function isValidBST(root) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Symmetric Tree",
    slug: "symmetric-tree",
    statement: "Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).",
    inputFormat: "Level-order tree array values.",
    outputFormat: "`true` or `false`.",
    constraints: "The number of nodes in tree is in range [1, 1000].\n-100 <= Node.val <= 100",
    difficulty: "EASY",
    topicTags: ["Trees", "BFS", "DFS"],
    companyTags: ["Amazon", "Microsoft", "Apple"],
    editorial: "### Approach: Recursive Mirror Comparison\nTwo trees are mirrors if `root1.val == root2.val` and left of root1 is mirror of right of root2.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(H)",
    testCases: [
      { input: "1 2 2 3 4 4 3", expectedOutput: "true", isSample: true },
      { input: "1 2 2 null 3 null 3", expectedOutput: "false", isSample: true },
      { input: "1", expectedOutput: "true", isSample: true },
      { input: "1 2 2 3 null null 3", expectedOutput: "true", isSample: false },
      { input: "2 3 3 4 5 5 4", expectedOutput: "true", isSample: false },
      { input: "1 2 3", expectedOutput: "false", isSample: false }
    ],
    codeTemplates: {
      python: `def isSymmetric(root: list) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nbool isSymmetric(std::vector<int>& root) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function isSymmetric(root) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Binary Tree Level Order Traversal",
    slug: "binary-tree-level-order-traversal",
    statement: "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    inputFormat: "Level-order tree array values.",
    outputFormat: "Each level's values on a separate line (space-separated).",
    constraints: "The number of nodes in tree is in range [0, 2000].\n-1000 <= Node.val <= 1000",
    difficulty: "MEDIUM",
    topicTags: ["Trees", "BFS"],
    companyTags: ["Amazon", "Meta", "Microsoft", "Google"],
    editorial: "### Approach: Breadth-First Search (Queue)\nUse a FIFO queue to process nodes level by level.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(W) where W is max tree width.",
    testCases: [
      { input: "3 9 20 null null 15 7", expectedOutput: "3\n9 20\n15 7", isSample: true },
      { input: "1", expectedOutput: "1", isSample: true },
      { input: "", expectedOutput: "", isSample: true },
      { input: "1 2 3 4 5 6 7", expectedOutput: "1\n2 3\n4 5 6 7", isSample: false },
      { input: "1 2 null 3 null 4", expectedOutput: "1\n2\n3\n4", isSample: false },
      { input: "10 5 15", expectedOutput: "10\n5 15", isSample: false }
    ],
    codeTemplates: {
      python: `def levelOrder(root: list) -> list[list[int]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<std::vector<int>> levelOrder(std::vector<int>& root) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function levelOrder(root) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Maximum Depth of Binary Tree",
    slug: "maximum-depth-of-binary-tree",
    statement: "Given the root of a binary tree, return its maximum depth.\n\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    inputFormat: "Level-order tree array values.",
    outputFormat: "Single integer output.",
    constraints: "The number of nodes in tree is in range [0, 10^4].\n-100 <= Node.val <= 100",
    difficulty: "EASY",
    topicTags: ["Trees", "DFS", "BFS"],
    companyTags: ["Amazon", "Google", "Microsoft", "Apple"],
    editorial: "### Approach: Recursive Post-order DFS\n`depth(root) = 1 + max(depth(root.left), depth(root.right))`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(H)",
    testCases: [
      { input: "3 9 20 null null 15 7", expectedOutput: "3", isSample: true },
      { input: "1 null 2", expectedOutput: "2", isSample: true },
      { input: "", expectedOutput: "0", isSample: true },
      { input: "1 2 3 4 5", expectedOutput: "3", isSample: false },
      { input: "1 2 null 3", expectedOutput: "3", isSample: false },
      { input: "10", expectedOutput: "1", isSample: false }
    ],
    codeTemplates: {
      python: `def maxDepth(root: list) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint maxDepth(std::vector<int>& root) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function maxDepth(root) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Construct Binary Tree from Preorder and Inorder Traversal",
    slug: "construct-binary-tree-from-preorder-and-inorder-traversal",
    statement: "Given two integer arrays `preorder` and `inorder` where `preorder` is the preorder traversal of a binary tree and `inorder` is the inorder traversal of the same tree, construct and return the binary tree (in level-order format).",
    inputFormat: "First line: space-separated integers for preorder.\nSecond line: space-separated integers for inorder.",
    outputFormat: "Level-order space-separated values.",
    constraints: "1 <= preorder.length <= 3000\ninorder.length == preorder.length\n-3000 <= preorder[i], inorder[i] <= 3000\npreorder and inorder consist of unique values.",
    difficulty: "MEDIUM",
    topicTags: ["Trees", "Arrays", "Hash Table"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    editorial: "### Approach: Divide & Conquer with Hash Map\nFirst element of `preorder` is root. Find root's position in `inorder` to determine size of left and right subtrees.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "3 9 20 15 7\n9 3 15 20 7", expectedOutput: "3 9 20 null null 15 7", isSample: true },
      { input: "-1\n-1", expectedOutput: "-1", isSample: true },
      { input: "1 2\n2 1", expectedOutput: "1 2", isSample: true },
      { input: "1 2 3\n2 1 3", expectedOutput: "1 2 3", isSample: false },
      { input: "1 2 4 5 3\n4 2 5 1 3", expectedOutput: "1 2 3 4 5", isSample: false },
      { input: "10 20 30\n20 10 30", expectedOutput: "10 20 30", isSample: false }
    ],
    codeTemplates: {
      python: `def buildTree(preorder: list[int], inorder: list[int]) -> list:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> buildTree(std::vector<int>& preorder, std::vector<int>& inorder) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function buildTree(preorder, inorder) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    statement: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    inputFormat: "Space-separated integers for prices array.",
    outputFormat: "Single integer output for max profit.",
    constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
    difficulty: "EASY",
    topicTags: ["Arrays", "DP"],
    companyTags: ["Amazon", "Google", "Microsoft", "Meta", "Apple"],
    editorial: "### Approach: One-pass Min Price Tracking\nTrack `min_price` seen so far. Update `max_profit = max(max_profit, current_price - min_price)`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "7 1 5 3 6 4", expectedOutput: "5", isSample: true, explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5." },
      { input: "7 6 4 3 1", expectedOutput: "0", isSample: true },
      { input: "1 2 3 4 5", expectedOutput: "4", isSample: true },
      { input: "2 4 1", expectedOutput: "2", isSample: false },
      { input: "3 2 6 5 0 3", expectedOutput: "4", isSample: false },
      { input: "10 20 5 15", expectedOutput: "10", isSample: false }
    ],
    codeTemplates: {
      python: `def maxProfit(prices: list[int]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint maxProfit(std::vector<int>& prices) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function maxProfit(prices) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Binary Tree Maximum Path Sum",
    slug: "binary-tree-maximum-path-sum",
    statement: "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. The path sum is the sum of the node's values in the path.\n\nGiven the root of a binary tree, return the maximum path sum of any non-empty path.",
    inputFormat: "Level-order tree array values.",
    outputFormat: "Single integer output.",
    constraints: "The number of nodes in tree is in range [1, 3 * 10^4].\n-1000 <= Node.val <= 1000",
    difficulty: "HARD",
    topicTags: ["Trees", "DFS", "DP"],
    companyTags: ["Meta", "Amazon", "Google", "Microsoft"],
    editorial: "### Approach: Post-Order DFS with Global Max\nCompute max gain from left and right children `max(0, gain)`. Update global `max_sum = max(max_sum, left_gain + right_gain + root.val)`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(H)",
    testCases: [
      { input: "1 2 3", expectedOutput: "6", isSample: true },
      { input: "-10 9 20 null null 15 7", expectedOutput: "42", isSample: true },
      { input: "-3", expectedOutput: "-3", isSample: true },
      { input: "2 -1 -2", expectedOutput: "2", isSample: false },
      { input: "1 -2 3", expectedOutput: "4", isSample: false },
      { input: "5 4 8 11 null 13 4 7 2 null null null 1", expectedOutput: "48", isSample: false }
    ],
    codeTemplates: {
      python: `def maxPathSum(root: list) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint maxPathSum(std::vector<int>& root) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function maxPathSum(root) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Word Break",
    slug: "word-break",
    statement: "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.",
    inputFormat: "First line: string s.\nSecond line: space-separated words for wordDict.",
    outputFormat: "`true` or `false`.",
    constraints: "1 <= s.length <= 300\n1 <= wordDict.length <= 1000\n1 <= wordDict[i].length <= 20\ns and wordDict[i] consist of lowercase English letters.",
    difficulty: "MEDIUM",
    topicTags: ["DP", "Hash Table", "Trie"],
    companyTags: ["Amazon", "Google", "Meta", "Microsoft"],
    editorial: "### Approach: 1D Dynamic Programming\n`dp[i]` is true if prefix `s[0..i]` can be segmented. `dp[i] = any(dp[j] and s[j..i] in wordDict)`.\n\n- **Time Complexity:** O(N^2 * L) where L is max word length.\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "leetcode\nleet code", expectedOutput: "true", isSample: true },
      { input: "applepenapple\napple pen", expectedOutput: "true", isSample: true },
      { input: "catsandog\ncats dog sand and cat", expectedOutput: "false", isSample: true },
      { input: "a\na", expectedOutput: "true", isSample: false },
      { input: "aaaaaaa\naaaa aaa", expectedOutput: "true", isSample: false },
      { input: "codeforge\ncode forge ai", expectedOutput: "true", isSample: false }
    ],
    codeTemplates: {
      python: `def wordBreak(s: str, wordDict: list[str]) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <string>\n#include <vector>\n\nbool wordBreak(std::string s, std::vector<std::string>& wordDict) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function wordBreak(s, wordDict) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Linked List Cycle",
    slug: "linked-list-cycle",
    statement: "Given `head`, the head of a linked list, determine if the linked list has a cycle in it.",
    inputFormat: "First line: space-separated list values.\nSecond line: pos integer (-1 for no cycle, else index cycle connects to).",
    outputFormat: "`true` or `false`.",
    constraints: "The number of nodes in list is in range [0, 10^4].\n-10^5 <= Node.val <= 10^5\npos is -1 or a valid index in the linked-list.",
    difficulty: "EASY",
    topicTags: ["Two Pointers", "Linked List"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    editorial: "### Approach: Floyd's Tortoise and Hare (Two Pointers)\nUse slow pointer (1 step) and fast pointer (2 steps). If there is a cycle, fast will meet slow.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "3 2 0 -4\n1", expectedOutput: "true", isSample: true },
      { input: "1 2\n0", expectedOutput: "true", isSample: true },
      { input: "1\n-1", expectedOutput: "false", isSample: true },
      { input: "\n-1", expectedOutput: "false", isSample: false },
      { input: "1 2 3 4 5\n-1", expectedOutput: "false", isSample: false },
      { input: "1 2 3 4 5\n2", expectedOutput: "true", isSample: false }
    ],
    codeTemplates: {
      python: `def hasCycle(head: list[int], pos: int) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nbool hasCycle(std::vector<int>& head, int pos) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function hasCycle(head, pos) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "LRU Cache",
    slug: "lru-cache",
    statement: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement `LRUCache` class:\n- `LRUCache(capacity)` Initializes with positive size capacity.\n- `get(key)` Returns value of key if key exists, otherwise -1.\n- `put(key, value)` Update value if key exists, else insert key-value pair. If key count exceeds capacity, evict least recently used key.",
    inputFormat: "First line: capacity.\nSecond line: sequence of operations ('get 1', 'put 1 10', etc.).",
    outputFormat: "Space-separated outputs for 'get' operations.",
    constraints: "1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nAt most 2 * 10^5 calls will be made to get and put.",
    difficulty: "MEDIUM",
    topicTags: ["Hash Table", "Linked List", "Design"],
    companyTags: ["Google", "Amazon", "Meta", "Microsoft", "Netflix"],
    editorial: "### Approach: Doubly Linked List + Hash Map\nHash Map maps key to node in Doubly Linked List. Head represents most recently used; tail represents least recently used.\n\n- **Time Complexity:** O(1) for both get and put.\n- **Space Complexity:** O(capacity)",
    testCases: [
      { input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4", expectedOutput: "1 -1 -1 3 4", isSample: true },
      { input: "1\nput 2 1\nget 2\nput 3 2\nget 2\nget 3", expectedOutput: "1 -1 2", isSample: true },
      { input: "2\nget 2\nput 2 6\nget 1\nput 1 5\nput 1 2\nget 1\nget 2", expectedOutput: "-1 -1 2 6", isSample: false },
      { input: "2\nput 2 1\nput 1 1\nput 2 3\nput 4 1\nget 1\nget 2", expectedOutput: "-1 3", isSample: false },
      { input: "3\nput 1 10\nput 2 20\nput 3 30\nget 1\nput 4 40\nget 2", expectedOutput: "10 -1", isSample: false },
      { input: "1\nget 5", expectedOutput: "-1", isSample: false }
    ],
    codeTemplates: {
      python: `class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass\n`,
      cpp: `class LRUCache {\npublic:\n    LRUCache(int capacity) {}\n    int get(int key) { return -1; }\n    void put(int key, int value) {}\n};\n`,
      javascript: `class LRUCache {\n  constructor(capacity) {}\n  get(key) { return -1; }\n  put(key, value) {}\n}\n`
    }
  },
  {
    title: "Number of Islands",
    slug: "number-of-islands",
    statement: "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    inputFormat: "First line: m and n.\nNext m lines: string of n binary digits ('1' or '0').",
    outputFormat: "Single integer output.",
    constraints: "m == grid.length, n == grid[i].length\n1 <= m, n <= 300\ngrid[i][j] is '0' or '1'.",
    difficulty: "MEDIUM",
    topicTags: ["Graphs", "BFS", "DFS", "Union Find"],
    companyTags: ["Amazon", "Google", "Microsoft", "Meta"],
    editorial: "### Approach: BFS / DFS Connected Components\nIterate grid cells. When `'1'` is found, increment count and sink connected land using DFS/BFS to `'0'`.\n\n- **Time Complexity:** O(M * N)\n- **Space Complexity:** O(M * N) worst case recursion/queue.",
    testCases: [
      { input: "4 5\n11110\n11010\n11000\n00000", expectedOutput: "1", isSample: true },
      { input: "4 5\n11000\n11000\n00100\n00011", expectedOutput: "3", isSample: true },
      { input: "1 1\n1", expectedOutput: "1", isSample: true },
      { input: "1 1\n0", expectedOutput: "0", isSample: false },
      { input: "3 3\n101\n010\n101", expectedOutput: "5", isSample: false },
      { input: "2 2\n11\n11", expectedOutput: "1", isSample: false }
    ],
    codeTemplates: {
      python: `def numIslands(grid: list[list[str]]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n#include <string>\n\nint numIslands(std::vector<std::vector<char>>& grid) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function numIslands(grid) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Course Schedule",
    slug: "course-schedule",
    statement: "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a_i, b_i]` indicates that you must take course `b_i` first if you want to take course `a_i`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.",
    inputFormat: "First line: numCourses.\nSecond line: integer p (number of prerequisites).\nNext p lines: a b.",
    outputFormat: "`true` or `false`.",
    constraints: "1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000\nprerequisites[i].length == 2\n0 <= a_i, b_i < numCourses\nAll pairs are unique.",
    difficulty: "MEDIUM",
    topicTags: ["Graphs", "Topological Sort", "DFS", "BFS"],
    companyTags: ["Amazon", "Google", "Microsoft", "Meta"],
    editorial: "### Approach: Topological Sort / Cycle Detection (Kahn's Algorithm)\nBuild adjacency list and compute in-degrees. If Kahn's algorithm processes all `numCourses`, no cycle exists.\n\n- **Time Complexity:** O(V + E)\n- **Space Complexity:** O(V + E)",
    testCases: [
      { input: "2\n1\n1 0", expectedOutput: "true", isSample: true, explanation: "To take course 1 you must have finished course 0. So it is possible." },
      { input: "2\n2\n1 0\n0 1", expectedOutput: "false", isSample: true, explanation: "Cycle detected!" },
      { input: "1\n0", expectedOutput: "true", isSample: true },
      { input: "3\n2\n1 0\n2 1", expectedOutput: "true", isSample: false },
      { input: "4\n4\n1 0\n2 1\n3 2\n0 3", expectedOutput: "false", isSample: false },
      { input: "3\n0", expectedOutput: "true", isSample: false }
    ],
    codeTemplates: {
      python: `def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nbool canFinish(int numCourses, std::vector<std::vector<int>>& prerequisites) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function canFinish(numCourses, prerequisites) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Coin Change",
    slug: "coin-change",
    statement: "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.",
    inputFormat: "First line: space-separated integers for coins array.\nSecond line: integer amount.",
    outputFormat: "Single integer representing min coins or -1.",
    constraints: "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["DP", "BFS"],
    companyTags: ["Amazon", "Microsoft", "Google", "Meta"],
    editorial: "### Approach: 1D Dynamic Programming (Bottom-Up)\n`dp[i] = min(dp[i], dp[i - coin] + 1)` for each `coin <= i`.\n\n- **Time Complexity:** O(amount * coins.length)\n- **Space Complexity:** O(amount)",
    testCases: [
      { input: "1 2 5\n11", expectedOutput: "3", isSample: true, explanation: "11 = 5 + 5 + 1" },
      { input: "2\n3", expectedOutput: "-1", isSample: true },
      { input: "1\n0", expectedOutput: "0", isSample: true },
      { input: "1\n1", expectedOutput: "1", isSample: false },
      { input: "1\n2", expectedOutput: "2", isSample: false },
      { input: "2 5 10 1", expectedOutput: "2", isSample: false }
    ],
    codeTemplates: {
      python: `def coinChange(coins: list[int], amount: int) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint coinChange(std::vector<int>& coins, int amount) {\n    // Write your solution here\n    return -1;\n}\n`,
      javascript: `function coinChange(coins, amount) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Longest Increasing Subsequence",
    slug: "longest-increasing-subsequence",
    statement: "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "Single integer output.",
    constraints: "1 <= nums.length <= 2500\n-10^4 <= nums[i] <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["DP", "Binary Search"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta"],
    editorial: "### Approach: Patience Sorting with Binary Search\nMaintain array `tails` storing smallest tail of all increasing subsequences of length `k`. Binary search `tails` for insertion index.\n\n- **Time Complexity:** O(N log N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "10 9 2 5 3 7 101 18", expectedOutput: "4", isSample: true, explanation: "The longest increasing subsequence is [2, 3, 7, 101], with length 4." },
      { input: "0 1 0 3 2 3", expectedOutput: "4", isSample: true },
      { input: "7 7 7 7 7 7 7", expectedOutput: "1", isSample: true },
      { input: "4 10 4 3 8 9", expectedOutput: "3", isSample: false },
      { input: "1 3 6 7 9 4 10 5 6", expectedOutput: "6", isSample: false },
      { input: "10", expectedOutput: "1", isSample: false }
    ],
    codeTemplates: {
      python: `def lengthOfLIS(nums: list[int]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint lengthOfLIS(std::vector<int>& nums) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function lengthOfLIS(nums) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Top K Frequent Elements",
    slug: "top-k-frequent-elements",
    statement: "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    inputFormat: "First line: space-separated integers for nums.\nSecond line: integer k.",
    outputFormat: "Space-separated integers for top k frequent elements.",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\nk is in the range [1, number of unique elements in the array].\nIt is guaranteed that the answer is unique.",
    difficulty: "MEDIUM",
    topicTags: ["Heap", "Hash Table", "Bucket Sort"],
    companyTags: ["Amazon", "Meta", "Google"],
    editorial: "### Approach: Bucket Sort or Min-Heap\nCount frequencies using Hash Map. Use bucket sort array of size `N+1` where index is frequency, or Min-Heap of size `k`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "1 1 1 2 2 3\n2", expectedOutput: "1 2", isSample: true },
      { input: "1\n1", expectedOutput: "1", isSample: true },
      { input: "4 4 4 5 5 6\n1", expectedOutput: "4", isSample: true },
      { input: "1 2 3 4 5\n3", expectedOutput: "1 2 3", isSample: false },
      { input: "-1 -1 2 2 2 3\n2", expectedOutput: "2 -1", isSample: false },
      { input: "10 20 10 30 20 10\n2", expectedOutput: "10 20", isSample: false }
    ],
    codeTemplates: {
      python: `def topKFrequent(nums: list[int], k: int) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> topKFrequent(std::vector<int>& nums, int k) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function topKFrequent(nums, k) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Kth Largest Element in an Array",
    slug: "kth-largest-element-in-an-array",
    statement: "Given an integer array `nums` and an integer `k`, return the `k-th` largest element in the array.\n\nNote that it is the `k-th` largest element in the sorted order, not the `k-th` distinct element.\n\nCan you solve it without sorting?",
    inputFormat: "First line: space-separated integers for nums.\nSecond line: integer k.",
    outputFormat: "Single integer output.",
    constraints: "1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["Heap", "Quickselect"],
    companyTags: ["Meta", "Amazon", "Google", "Microsoft"],
    editorial: "### Approach: Min-Heap or Quickselect\nMaintain a Min-Heap of size `k`. Push elements and pop when size > k. Top of heap is kth largest.\n\n- **Time Complexity:** O(N log k)\n- **Space Complexity:** O(k)",
    testCases: [
      { input: "3 2 1 5 6 4\n2", expectedOutput: "5", isSample: true },
      { input: "3 2 3 1 2 4 5 5 6\n4", expectedOutput: "4", isSample: true },
      { input: "1\n1", expectedOutput: "1", isSample: true },
      { input: "7 10 4 3 20 15\n3", expectedOutput: "10", isSample: false },
      { input: "-1 -2 -3 -4 -5\n2", expectedOutput: "-2", isSample: false },
      { input: "100 200 300\n1", expectedOutput: "300", isSample: false }
    ],
    codeTemplates: {
      python: `def findKthLargest(nums: list[int], k: int) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint findKthLargest(std::vector<int>& nums, int k) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function findKthLargest(nums, k) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Product of Array Except Self",
    slug: "product-of-array-except-self",
    statement: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "Space-separated integers for answer array.",
    constraints: "2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nThe product of any prefix or suffix of nums fits in 32-bit integer.",
    difficulty: "MEDIUM",
    topicTags: ["Arrays", "Prefix Sum"],
    companyTags: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
    editorial: "### Approach: Prefix and Suffix Product Pass\nPass 1: calculate prefix products. Pass 2: multiply with suffix products backwards.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1) extra space excluding output array.",
    testCases: [
      { input: "1 2 3 4", expectedOutput: "24 12 8 6", isSample: true },
      { input: "-1 1 0 -3 3", expectedOutput: "0 0 9 0 0", isSample: true },
      { input: "2 3", expectedOutput: "3 2", isSample: true },
      { input: "0 0", expectedOutput: "0 0", isSample: false },
      { input: "5 2 4", expectedOutput: "8 20 10", isSample: false },
      { input: "-2 -3 -4", expectedOutput: "12 8 6", isSample: false }
    ],
    codeTemplates: {
      python: `def productExceptSelf(nums: list[int]) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> productExceptSelf(std::vector<int>& nums) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function productExceptSelf(nums) {\n  // Write your solution here\n}\n`
    }
  }
];
