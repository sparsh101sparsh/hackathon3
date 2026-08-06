import { ProblemSeed } from './problemsPart1';

export const problemsPart2: ProblemSeed[] = [
  {
    title: "Group Anagrams",
    slug: "group-anagrams",
    statement: "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    inputFormat: "Space-separated string values `strs`.",
    outputFormat: "Groups of space-separated strings, one group per line.",
    constraints: "1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.",
    difficulty: "MEDIUM",
    topicTags: ["Hash Table", "Strings", "Sorting"],
    companyTags: ["Amazon", "Meta", "Google", "Microsoft"],
    editorial: "### Approach: Hash Map by Sorted Key or Frequency Count\nUse character frequency array or sorted string as hash map key, storing matching strings in array.\n\n- **Time Complexity:** O(N * K log K) or O(N * K) where K is max string length.\n- **Space Complexity:** O(N * K)",
    testCases: [
      { input: "eat tea tan ate nat bat", expectedOutput: "eat tea ate\ntan nat\nbat", isSample: true },
      { input: "", expectedOutput: "", isSample: true },
      { input: "a", expectedOutput: "a", isSample: true },
      { input: "ab ba abc cab bca", expectedOutput: "ab ba\nabc cab bca", isSample: false },
      { input: "listen silent enlist google", expectedOutput: "listen silent enlist\ngoogle", isSample: false },
      { input: "rat tar art car", expectedOutput: "rat tar art\ncar", isSample: false }
    ],
    codeTemplates: {
      python: `def groupAnagrams(strs: list[str]) -> list[list[str]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n#include <string>\n\nstd::vector<std::vector<std::string>> groupAnagrams(std::vector<std::string>& strs) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function groupAnagrams(strs) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    statement: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "Single integer output.",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["Arrays", "DP", "Divide and Conquer"],
    companyTags: ["Google", "Amazon", "Microsoft", "Apple"],
    editorial: "### Approach: Kadane's Algorithm\nMaintain `current_sum` and `max_sum`. Update `current_sum = max(nums[i], current_sum + nums[i])`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isSample: true, explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
      { input: "1", expectedOutput: "1", isSample: true },
      { input: "5 4 -1 7 8", expectedOutput: "23", isSample: true },
      { input: "-1 -2 -3 -4", expectedOutput: "-1", isSample: false },
      { input: "10 -2 3 4 -1 2", expectedOutput: "16", isSample: false },
      { input: "-5 10 -2 8 -1", expectedOutput: "16", isSample: false }
    ],
    codeTemplates: {
      python: `def maxSubArray(nums: list[int]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint maxSubArray(std::vector<int>& nums) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function maxSubArray(nums) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Spiral Matrix",
    slug: "spiral-matrix",
    statement: "Given an `m x n` matrix, return all elements of the matrix in spiral order.",
    inputFormat: "First line: m and n.\nNext m lines: space-separated integers for matrix row.",
    outputFormat: "Space-separated integers in spiral traversal order.",
    constraints: "m == matrix.length, n == matrix[i].length\n1 <= m, n <= 10\n-100 <= matrix[i][j] <= 100",
    difficulty: "MEDIUM",
    topicTags: ["Arrays", "Matrix"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    editorial: "### Approach: Boundary Traversal\nMaintain boundaries: `top`, `bottom`, `left`, `right`. Traverse right across top, down right, left across bottom, up left, shrinking boundaries.\n\n- **Time Complexity:** O(M * N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "3 3\n1 2 3\n4 5 6\n7 8 9", expectedOutput: "1 2 3 6 9 8 7 4 5", isSample: true },
      { input: "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12", expectedOutput: "1 2 3 4 8 12 11 10 9 5 6 7", isSample: true },
      { input: "1 1\n42", expectedOutput: "42", isSample: true },
      { input: "2 2\n1 2\n3 4", expectedOutput: "1 2 4 3", isSample: false },
      { input: "4 1\n1\n2\n3\n4", expectedOutput: "1 2 3 4", isSample: false },
      { input: "1 4\n1 2 3 4", expectedOutput: "1 2 3 4", isSample: false }
    ],
    codeTemplates: {
      python: `def spiralOrder(matrix: list[list[int]]) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> spiralOrder(std::vector<std::vector<int>>& matrix) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function spiralOrder(matrix) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Jump Game",
    slug: "jump-game",
    statement: "You are given an integer array `nums`. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position.\n\nReturn `true` if you can reach the last index, or `false` otherwise.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "`true` or `false`.",
    constraints: "1 <= nums.length <= 10^4\n0 <= nums[i] <= 10^5",
    difficulty: "MEDIUM",
    topicTags: ["Greedy", "Arrays", "DP"],
    companyTags: ["Amazon", "Google", "Microsoft", "Meta"],
    editorial: "### Approach: Greedy maxReach\nIterate through array tracking `maxReach`. If `i > maxReach`, return `false`. Update `maxReach = max(maxReach, i + nums[i])`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "2 3 1 1 4", expectedOutput: "true", isSample: true },
      { input: "3 2 1 0 4", expectedOutput: "false", isSample: true },
      { input: "0", expectedOutput: "true", isSample: true },
      { input: "2 0 0", expectedOutput: "true", isSample: false },
      { input: "1 0 1 0", expectedOutput: "false", isSample: false },
      { input: "5 4 0 0 0 0 0", expectedOutput: "true", isSample: false }
    ],
    codeTemplates: {
      python: `def canJump(nums: list[int]) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nbool canJump(std::vector<int>& nums) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function canJump(nums) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Merge Intervals",
    slug: "merge-intervals",
    statement: "Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    inputFormat: "First line: integer n.\nNext n lines: two space-separated integers start end.",
    outputFormat: "Merged intervals line by line formatted as 'start end'.",
    constraints: "1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= start_i <= end_i <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["Arrays", "Sorting"],
    companyTags: ["Google", "Amazon", "Meta", "Microsoft"],
    editorial: "### Approach: Sort by Start Time\nSort intervals by start time. Iterate and merge current interval with previous if `curr.start <= prev.end`.\n\n- **Time Complexity:** O(N log N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "4\n1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18", isSample: true },
      { input: "2\n1 4\n4 5", expectedOutput: "1 5", isSample: true },
      { input: "1\n1 4", expectedOutput: "1 4", isSample: true },
      { input: "3\n1 4\n0 4\n2 3", expectedOutput: "0 4", isSample: false },
      { input: "2\n1 4\n2 3", expectedOutput: "1 4", isSample: false },
      { input: "3\n2 3\n4 5\n6 7", expectedOutput: "2 3\n4 5\n6 7", isSample: false }
    ],
    codeTemplates: {
      python: `def merge(intervals: list[list[int]]) -> list[list[int]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<std::vector<int>> merge(std::vector<std::vector<int>>& intervals) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function merge(intervals) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Insert Interval",
    slug: "insert-interval",
    statement: "You are given an array of non-overlapping intervals `intervals` sorted by start time, and `newInterval = [start, end]`. Insert `newInterval` into `intervals` such that `intervals` is still sorted and non-overlapping.",
    inputFormat: "First line: integer n.\nNext n lines: start end of intervals.\nLast line: start end of newInterval.",
    outputFormat: "Merged intervals line by line formatted as 'start end'.",
    constraints: "0 <= intervals.length <= 10^4\n0 <= start <= end <= 10^5",
    difficulty: "MEDIUM",
    topicTags: ["Arrays"],
    companyTags: ["Google", "Amazon", "Meta"],
    editorial: "### Approach: One-pass Partitioning\nAdd intervals ending before `newInterval.start`. Merge overlapping intervals into `newInterval`. Add remaining intervals.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "2\n1 3\n6 9\n2 5", expectedOutput: "1 5\n6 9", isSample: true },
      { input: "5\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8", expectedOutput: "1 2\n3 10\n12 16", isSample: true },
      { input: "0\n5 7", expectedOutput: "5 7", isSample: true },
      { input: "2\n1 5\n6 8\n0 0", expectedOutput: "0 0\n1 5\n6 8", isSample: false },
      { input: "1\n1 5\n2 7", expectedOutput: "1 7", isSample: false },
      { input: "1\n1 5\n6 8", expectedOutput: "1 5\n6 8", isSample: false }
    ],
    codeTemplates: {
      python: `def insert(intervals: list[list[int]], newInterval: list[int]) -> list[list[int]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<std::vector<int>> insert(std::vector<std::vector<int>>& intervals, std::vector<int>& newInterval) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function insert(intervals, newInterval) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Unique Paths",
    slug: "unique-paths",
    statement: "There is a robot on an `m x n` grid. The robot is initially located at top-left corner `(0, 0)`. The robot tries to move to bottom-right corner `(m - 1, n - 1)`. The robot can only move either down or right at any point in time.\n\nGiven integers `m` and `n`, return the number of possible unique paths.",
    inputFormat: "Two space-separated integers m and n.",
    outputFormat: "Single integer output.",
    constraints: "1 <= m, n <= 100\nResult is guaranteed <= 2 * 10^9.",
    difficulty: "MEDIUM",
    topicTags: ["DP", "Combinatorics"],
    companyTags: ["Google", "Amazon", "Microsoft"],
    editorial: "### Approach: 2D Dynamic Programming / Combinatorics\n`dp[i][j] = dp[i-1][j] + dp[i][j-1]`. Or compute combination `(m+n-2) C (m-1)`.\n\n- **Time Complexity:** O(M * N) or O(min(M, N))\n- **Space Complexity:** O(N) or O(1)",
    testCases: [
      { input: "3 7", expectedOutput: "28", isSample: true },
      { input: "3 2", expectedOutput: "3", isSample: true },
      { input: "3 3", expectedOutput: "6", isSample: true },
      { input: "1 1", expectedOutput: "1", isSample: false },
      { input: "10 10", expectedOutput: "48620", isSample: false },
      { input: "7 3", expectedOutput: "28", isSample: false }
    ],
    codeTemplates: {
      python: `def uniquePaths(m: int, n: int) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `int uniquePaths(int m, int n) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function uniquePaths(m, n) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Minimum Path Sum",
    slug: "minimum-path-sum",
    statement: "Given a `m x n` grid filled with non-negative numbers, find a path from top left to bottom right, which minimizes the sum of all numbers along its path.\n\nNote: You can only move either down or right at any point in time.",
    inputFormat: "First line: m and n.\nNext m lines: n space-separated integers for grid values.",
    outputFormat: "Single integer representing minimum path sum.",
    constraints: "m == grid.length, n == grid[i].length\n1 <= m, n <= 200\n0 <= grid[i][j] <= 200",
    difficulty: "MEDIUM",
    topicTags: ["DP", "Matrix"],
    companyTags: ["Amazon", "Google", "Meta"],
    editorial: "### Approach: Dynamic Programming\n`dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`.\n\n- **Time Complexity:** O(M * N)\n- **Space Complexity:** O(M * N) or O(N)",
    testCases: [
      { input: "3 3\n1 3 1\n1 5 1\n4 2 1", expectedOutput: "7", isSample: true, explanation: "Path 1 -> 3 -> 1 -> 1 -> 1 minimizes sum to 7." },
      { input: "2 3\n1 2 3\n4 5 6", expectedOutput: "12", isSample: true },
      { input: "1 1\n5", expectedOutput: "5", isSample: true },
      { input: "2 2\n1 10\n1 1", expectedOutput: "3", isSample: false },
      { input: "3 1\n1\n2\n3", expectedOutput: "6", isSample: false },
      { input: "1 3\n1 2 3", expectedOutput: "6", isSample: false }
    ],
    codeTemplates: {
      python: `def minPathSum(grid: list[list[int]]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint minPathSum(std::vector<std::vector<int>>& grid) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function minPathSum(grid) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    statement: "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    inputFormat: "Single integer `n`.",
    outputFormat: "Single integer output.",
    constraints: "1 <= n <= 45",
    difficulty: "EASY",
    topicTags: ["DP", "Math"],
    companyTags: ["Amazon", "Google", "Microsoft", "Apple"],
    editorial: "### Approach: Fibonacci DP\n`dp[i] = dp[i-1] + dp[i-2]`. Base cases `dp[1] = 1, dp[2] = 2`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "2", expectedOutput: "2", isSample: true, explanation: "1 step + 1 step, or 2 steps." },
      { input: "3", expectedOutput: "3", isSample: true, explanation: "1+1+1, 1+2, 2+1." },
      { input: "4", expectedOutput: "5", isSample: true },
      { input: "1", expectedOutput: "1", isSample: false },
      { input: "5", expectedOutput: "8", isSample: false },
      { input: "10", expectedOutput: "89", isSample: false }
    ],
    codeTemplates: {
      python: `def climbStairs(n: int) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `int climbStairs(int n) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function climbStairs(n) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Edit Distance",
    slug: "edit-distance",
    statement: "Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.\n\nYou have the following three operations permitted on a word:\n1. Insert a character\n2. Delete a character\n3. Replace a character",
    inputFormat: "First line: word1.\nSecond line: word2.",
    outputFormat: "Single integer representing min operations.",
    constraints: "0 <= word1.length, word2.length <= 500\nword1 and word2 consist of lowercase English letters.",
    difficulty: "HARD",
    topicTags: ["DP", "Strings"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta"],
    editorial: "### Approach: 2D Dynamic Programming (Levenshtein Distance)\n`dp[i][j]` represents min edits to turn `word1[0..i]` into `word2[0..j]`.\nIf `word1[i] == word2[j]`, `dp[i][j] = dp[i-1][j-1]`.\nElse `dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`.\n\n- **Time Complexity:** O(M * N)\n- **Space Complexity:** O(M * N)",
    testCases: [
      { input: "horse\nros", expectedOutput: "3", isSample: true, explanation: "horse -> rorse -> rose -> ros" },
      { input: "intention\nexecution", expectedOutput: "5", isSample: true },
      { input: "\na", expectedOutput: "1", isSample: true },
      { input: "a\n", expectedOutput: "1", isSample: false },
      { input: "abc\nabc", expectedOutput: "0", isSample: false },
      { input: "kitten\nsitting", expectedOutput: "3", isSample: false }
    ],
    codeTemplates: {
      python: `def minDistance(word1: str, word2: str) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <string>\n\nint minDistance(std::string word1, std::string word2) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function minDistance(word1, word2) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Set Matrix Zeroes",
    slug: "set-matrix-zeroes",
    statement: "Given an `m x n` integer matrix `matrix`, if an element is 0, set its entire row and column to 0's. You must do it in place.",
    inputFormat: "First line: m and n.\nNext m lines: n space-separated integers.",
    outputFormat: "Matrix printed with space-separated integers, row by row.",
    constraints: "m == matrix.length, n == matrix[i].length\n1 <= m, n <= 200\n-2^31 <= matrix[i][j] <= 2^31 - 1",
    difficulty: "MEDIUM",
    topicTags: ["Arrays", "Matrix"],
    companyTags: ["Google", "Amazon", "Microsoft"],
    editorial: "### Approach: In-Place Markers using 1st Row and 1st Column\nUse `matrix[0][j]` and `matrix[i][0]` as indicators to record if row `i` or col `j` should be zeroed.\n\n- **Time Complexity:** O(M * N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "3 3\n1 1 1\n1 0 1\n1 1 1", expectedOutput: "1 0 1\n0 0 0\n1 0 1", isSample: true },
      { input: "3 4\n0 1 2 0\n3 4 5 2\n1 3 1 5", expectedOutput: "0 0 0 0\n0 4 5 0\n0 3 1 0", isSample: true },
      { input: "1 1\n0", expectedOutput: "0", isSample: true },
      { input: "2 2\n1 2\n3 4", expectedOutput: "1 2\n3 4", isSample: false },
      { input: "2 3\n1 0 3\n4 5 6", expectedOutput: "0 0 0\n4 0 6", isSample: false },
      { input: "3 1\n1\n0\n3", expectedOutput: "0\n0\n0", isSample: false }
    ],
    codeTemplates: {
      python: `def setZeroes(matrix: list[list[int]]) -> None:\n    # Modify matrix in-place\n    pass\n`,
      cpp: `#include <vector>\n\nvoid setZeroes(std::vector<std::vector<int>>& matrix) {\n    // Modify matrix in-place\n}\n`,
      javascript: `function setZeroes(matrix) {\n  // Modify matrix in-place\n}\n`
    }
  },
  {
    title: "Search a 2D Matrix",
    slug: "search-a-2d-matrix",
    statement: "You are given an `m x n` integer matrix `matrix` with the following two properties:\n- Each row is sorted in non-decreasing order.\n- The first integer of each row is greater than the last integer of the previous row.\n\nGiven an integer `target`, return `true` if `target` is in `matrix` or `false` otherwise.\n\nYou must write a solution in `O(log(m * n))` time complexity.",
    inputFormat: "First line: m and n.\nNext m lines: n space-separated integers.\nLast line: target integer.",
    outputFormat: "`true` or `false`.",
    constraints: "m == matrix.length, n == matrix[i].length\n1 <= m, n <= 100\n-10^4 <= matrix[i][j], target <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["Binary Search", "Matrix", "Arrays"],
    companyTags: ["Amazon", "Microsoft", "Meta"],
    editorial: "### Approach: Treat 2D Matrix as 1D Flattened Array\nBinary search over indices `0` to `m*n - 1`. Convert mid index `idx` to row `idx // n` and col `idx % n`.\n\n- **Time Complexity:** O(log(M * N))\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n3", expectedOutput: "true", isSample: true },
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n13", expectedOutput: "false", isSample: true },
      { input: "1 1\n1\n1", expectedOutput: "true", isSample: true },
      { input: "1 2\n1 3\n3", expectedOutput: "true", isSample: false },
      { input: "2 2\n1 3\n5 7\n4", expectedOutput: "false", isSample: false },
      { input: "3 3\n1 2 3\n4 5 6\n7 8 9\n8", expectedOutput: "true", isSample: false }
    ],
    codeTemplates: {
      python: `def searchMatrix(matrix: list[list[int]], target: int) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nbool searchMatrix(std::vector<std::vector<int>>& matrix, int target) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function searchMatrix(matrix, target) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Sort Colors",
    slug: "sort-colors",
    statement: "Given an array `nums` with `n` objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue.\n\nWe will use integers `0`, `1`, and `2` to represent the color red, white, and blue, respectively.\n\nYou must solve this problem without using the library's sort function.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "Space-separated integers for sorted array.",
    constraints: "n == nums.length\n1 <= n <= 300\nnums[i] is either 0, 1, or 2.",
    difficulty: "MEDIUM",
    topicTags: ["Two Pointers", "Arrays", "Sorting"],
    companyTags: ["Microsoft", "Amazon", "Meta", "Google"],
    editorial: "### Approach: Dutch National Flag Problem (Three Pointers)\nMaintain `low`, `mid`, and `high` pointers. Swap `0`s to `low`, `2`s to `high`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "2 0 2 1 1 0", expectedOutput: "0 0 1 1 2 2", isSample: true },
      { input: "2 0 1", expectedOutput: "0 1 2", isSample: true },
      { input: "0", expectedOutput: "0", isSample: true },
      { input: "1 1 1", expectedOutput: "1 1 1", isSample: false },
      { input: "2 2 1 0 0", expectedOutput: "0 0 1 2 2", isSample: false },
      { input: "1 0 2 1 0 2", expectedOutput: "0 0 1 1 2 2", isSample: false }
    ],
    codeTemplates: {
      python: `def sortColors(nums: list[int]) -> None:\n    # Modify nums in-place\n    pass\n`,
      cpp: `#include <vector>\n\nvoid sortColors(std::vector<int>& nums) {\n    // Modify nums in-place\n}\n`,
      javascript: `function sortColors(nums) {\n  // Modify nums in-place\n}\n`
    }
  },
  {
    title: "Subsets",
    slug: "subsets",
    statement: "Given an integer array `nums` of unique elements, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "Subsets line by line, each formatted as space-separated integers.",
    constraints: "1 <= nums.length <= 10\n-10 <= nums[i] <= 10\nAll the numbers of nums are unique.",
    difficulty: "MEDIUM",
    topicTags: ["Backtracking", "Arrays", "Bit Manipulation"],
    companyTags: ["Meta", "Amazon", "Google", "Microsoft"],
    editorial: "### Approach: Backtracking or Cascading\nIteratively or recursively build subsets by either including or excluding element at index `i`.\n\n- **Time Complexity:** O(2^N * N)\n- **Space Complexity:** O(N) recursion depth.",
    testCases: [
      { input: "1 2 3", expectedOutput: "\n1\n2\n1 2\n3\n1 3\n2 3\n1 2 3", isSample: true },
      { input: "0", expectedOutput: "\n0", isSample: true },
      { input: "1 2", expectedOutput: "\n1\n2\n1 2", isSample: true },
      { input: "5", expectedOutput: "\n5", isSample: false },
      { input: "1 3 5", expectedOutput: "\n1\n3\n1 3\n5\n1 5\n3 5\n1 3 5", isSample: false },
      { input: "2 4", expectedOutput: "\n2\n4\n2 4", isSample: false }
    ],
    codeTemplates: {
      python: `def subsets(nums: list[int]) -> list[list[int]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<std::vector<int>> subsets(std::vector<int>& nums) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function subsets(nums) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Word Search",
    slug: "word-search",
    statement: "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
    inputFormat: "First line: m and n.\nNext m lines: string of n characters for each row.\nLast line: word.",
    outputFormat: "`true` or `false`.",
    constraints: "m == board.length, n == board[i].length\n1 <= m, n <= 6\n1 <= word.length <= 15\nboard and word consist of lowercase/uppercase English letters.",
    difficulty: "MEDIUM",
    topicTags: ["Backtracking", "Matrix", "DFS"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    editorial: "### Approach: Backtracking DFS\nFor each starting cell `(r, c)`, launch DFS checking matched character count. Mark visited cell in-place, restore upon backtrack.\n\n- **Time Complexity:** O(M * N * 3^L) where L is word length.\n- **Space Complexity:** O(L) recursion depth.",
    testCases: [
      { input: "3 4\nABCE\nSFCS\nADEE\nABCCED", expectedOutput: "true", isSample: true },
      { input: "3 4\nABCE\nSFCS\nADEE\nSEE", expectedOutput: "true", isSample: true },
      { input: "3 4\nABCE\nSFCS\nADEE\nABCB", expectedOutput: "false", isSample: true },
      { input: "1 1\nA\nA", expectedOutput: "true", isSample: false },
      { input: "2 2\nAB\nCD\nAC", expectedOutput: "true", isSample: false },
      { input: "2 2\nAB\nCD\nAD", expectedOutput: "false", isSample: false }
    ],
    codeTemplates: {
      python: `def exist(board: list[list[str]], word: str) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n#include <string>\n\nbool exist(std::vector<std::vector<char>>& board, std::string word) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function exist(board, word) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Largest Rectangle in Histogram",
    slug: "largest-rectangle-in-histogram",
    statement: "Given an array of integers `heights` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    inputFormat: "Space-separated integers for heights array.",
    outputFormat: "Single integer output for max area.",
    constraints: "1 <= heights.length <= 10^5\n0 <= heights[i] <= 10^4",
    difficulty: "HARD",
    topicTags: ["Stack", "Arrays"],
    companyTags: ["Google", "Amazon", "Meta", "Microsoft"],
    editorial: "### Approach: Monotonic Stack\nMaintain a stack storing indices of increasing heights. When a smaller height is encountered, pop elements and compute maximum area.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "2 1 5 6 2 3", expectedOutput: "10", isSample: true },
      { input: "2 4", expectedOutput: "4", isSample: true },
      { input: "0", expectedOutput: "0", isSample: true },
      { input: "1 1 1 1 1", expectedOutput: "5", isSample: false },
      { input: "5 4 3 2 1", expectedOutput: "9", isSample: false },
      { input: "2 1 2", expectedOutput: "3", isSample: false }
    ],
    codeTemplates: {
      python: `def largestRectangleArea(heights: list[int]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint largestRectangleArea(std::vector<int>& heights) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function largestRectangleArea(heights) {\n  // Write your solution here\n}\n`
    }
  }
];
