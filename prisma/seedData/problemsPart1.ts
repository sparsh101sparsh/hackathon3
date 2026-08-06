export interface ProblemSeed {
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
  timeLimit?: number;
  memoryLimit?: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isSample: boolean;
    explanation?: string;
  }>;
  codeTemplates: {
    python: string;
    cpp: string;
    javascript: string;
  };
}

export const problemsPart1: ProblemSeed[] = [
  {
    title: "Two Sum",
    slug: "two-sum",
    statement: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    inputFormat: "First line contains space-separated integers representing `nums`.\nSecond line contains integer `target`.",
    outputFormat: "Two space-separated integers representing indices.",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nExactly one valid answer exists.",
    difficulty: "EASY",
    topicTags: ["Arrays", "Hash Table"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta"],
    editorial: "### Approach: Hash Map (One Pass)\nWe can iterate through the array once while storing each number and its index in a hash map. For each number `x`, we check if `target - x` exists in the hash map.\n\n- **Time Complexity:** O(N) where N is the number of elements.\n- **Space Complexity:** O(N) for storing elements in the hash map.",
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1", isSample: true, explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "3 2 4\n6", expectedOutput: "1 2", isSample: true, explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]." },
      { input: "3 3\n6", expectedOutput: "0 1", isSample: true, explanation: "Because nums[0] + nums[1] == 6, we return [0, 1]." },
      { input: "1 5 3 7 9\n12", expectedOutput: "2 4", isSample: false },
      { input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4", isSample: false },
      { input: "100 200 500 1000\n700", expectedOutput: "1 2", isSample: false }
    ],
    codeTemplates: {
      python: `def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n#include <unordered_map>\n\nstd::vector<int> twoSum(std::vector<int>& nums, int target) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function twoSum(nums, target) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Add Two Numbers",
    slug: "add-two-numbers",
    statement: "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.\n\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.",
    inputFormat: "First line: space-separated integers for first list.\nSecond line: space-separated integers for second list.",
    outputFormat: "Space-separated integers of the resulting sum list.",
    constraints: "The number of nodes in each linked list is in the range [1, 100].\n0 <= Node.val <= 9",
    difficulty: "MEDIUM",
    topicTags: ["Linked List", "Math"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Apple"],
    editorial: "### Approach: Dummy Head Simulation\nKeep track of the carry using a loop over both lists until both lists and carry are exhausted.\n\n- **Time Complexity:** O(max(N, M))\n- **Space Complexity:** O(max(N, M)) for output list.",
    testCases: [
      { input: "2 4 3\n5 6 4", expectedOutput: "7 0 8", isSample: true, explanation: "342 + 465 = 807." },
      { input: "0\n0", expectedOutput: "0", isSample: true, explanation: "0 + 0 = 0." },
      { input: "9 9 9 9 9 9 9\n9 9 9 9", expectedOutput: "8 9 9 9 0 0 0 1", isSample: true, explanation: "9999999 + 9999 = 10009998." },
      { input: "1 8\n0", expectedOutput: "1 8", isSample: false },
      { input: "5\n5", expectedOutput: "0 1", isSample: false },
      { input: "1 2 3\n4 5 6", expectedOutput: "5 7 9", isSample: false }
    ],
    codeTemplates: {
      python: `def addTwoNumbers(l1: list[int], l2: list[int]) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> addTwoNumbers(std::vector<int>& l1, std::vector<int>& l2) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function addTwoNumbers(l1, l2) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    statement: "Given a string `s`, find the length of the longest substring without repeating characters.",
    inputFormat: "Single line containing string `s`.",
    outputFormat: "An integer representing max length.",
    constraints: "0 <= s.length <= 5 * 10^4\n`s` consists of English letters, digits, symbols and spaces.",
    difficulty: "MEDIUM",
    topicTags: ["Hash Table", "Sliding Window", "Strings"],
    companyTags: ["Google", "Amazon", "Meta", "Netflix"],
    editorial: "### Approach: Sliding Window with Hash Map\nMaintain a window `[left, right]` and a hash map storing the last seen index of each character.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(min(N, M)) where M is alphabet size.",
    testCases: [
      { input: "abcabcbb", expectedOutput: "3", isSample: true, explanation: "The answer is \"abc\", with the length of 3." },
      { input: "bbbbb", expectedOutput: "1", isSample: true, explanation: "The answer is \"b\", with the length of 1." },
      { input: "pwwkew", expectedOutput: "3", isSample: true, explanation: "The answer is \"wke\", with length of 3." },
      { input: "", expectedOutput: "0", isSample: false },
      { input: "au", expectedOutput: "2", isSample: false },
      { input: "dvdf", expectedOutput: "3", isSample: false }
    ],
    codeTemplates: {
      python: `def lengthOfLongestSubstring(s: str) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <string>\n\nint lengthOfLongestSubstring(std::string s) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function lengthOfLongestSubstring(s) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    statement: "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be `O(log (m+n))`.",
    inputFormat: "First line: space-separated integers for nums1.\nSecond line: space-separated integers for nums2.",
    outputFormat: "A float representing median formatted to 5 decimal places.",
    constraints: "nums1.length == m, nums2.length == n\n0 <= m, n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6",
    difficulty: "HARD",
    topicTags: ["Arrays", "Binary Search", "Divide and Conquer"],
    companyTags: ["Google", "Microsoft", "Amazon", "Apple"],
    editorial: "### Approach: Binary Search on Partition\nPerform binary search on the smaller array to partition both arrays such that elements on left half are <= elements on right half.\n\n- **Time Complexity:** O(log(min(M, N)))\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "1 3\n2", expectedOutput: "2.00000", isSample: true, explanation: "merged array = [1,2,3] and median is 2.0." },
      { input: "1 2\n3 4", expectedOutput: "2.50000", isSample: true, explanation: "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5." },
      { input: "0 0\n0 0", expectedOutput: "0.00000", isSample: true },
      { input: "1 2 3 4 5\n6 7 8 9", expectedOutput: "5.00000", isSample: false },
      { input: "100000\n100001", expectedOutput: "100000.50000", isSample: false },
      { input: "2 3 4\n1", expectedOutput: "2.50000", isSample: false }
    ],
    codeTemplates: {
      python: `def findMedianSortedArrays(nums1: list[int], nums2: list[int]) -> float:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\ndouble findMedianSortedArrays(std::vector<int>& nums1, std::vector<int>& nums2) {\n    // Write your solution here\n    return 0.0;\n}\n`,
      javascript: `function findMedianSortedArrays(nums1, nums2) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Longest Palindromic Substring",
    slug: "longest-palindromic-substring",
    statement: "Given a string `s`, return the longest palindromic substring in `s`.",
    inputFormat: "Single string `s`.",
    outputFormat: "String representing longest palindrome.",
    constraints: "1 <= s.length <= 1000\n`s` consists of only digits and English letters.",
    difficulty: "MEDIUM",
    topicTags: ["Strings", "DP"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    editorial: "### Approach: Expand Around Center\nExpand outward from each character (odd length) and between character pairs (even length).\n\n- **Time Complexity:** O(N^2)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "babad", expectedOutput: "bab", isSample: true, explanation: "\"aba\" is also a valid answer." },
      { input: "cbbd", expectedOutput: "bb", isSample: true },
      { input: "a", expectedOutput: "a", isSample: true },
      { input: "ac", expectedOutput: "a", isSample: false },
      { input: "racecar", expectedOutput: "racecar", isSample: false },
      { input: "bananas", expectedOutput: "anana", isSample: false }
    ],
    codeTemplates: {
      python: `def longestPalindrome(s: str) -> str:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <string>\n\nstd::string longestPalindrome(std::string s) {\n    // Write your solution here\n    return "";\n}\n`,
      javascript: `function longestPalindrome(s) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Reverse Integer",
    slug: "reverse-integer",
    statement: "Given a signed 32-bit integer `x`, return `x` with its digits reversed. If reversing `x` causes the value to go outside the signed 32-bit integer range `[-2^31, 2^31 - 1]`, then return `0`.",
    inputFormat: "Single integer `x`.",
    outputFormat: "Single integer output.",
    constraints: "-2^31 <= x <= 2^31 - 1",
    difficulty: "MEDIUM",
    topicTags: ["Math"],
    companyTags: ["Apple", "Amazon", "Microsoft"],
    editorial: "### Approach: Pop and Push Digits with Overflow Check\nExtract digits from right using `% 10` and build reversed integer while checking 32-bit overflow limits.\n\n- **Time Complexity:** O(log10(x))\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "123", expectedOutput: "321", isSample: true },
      { input: "-123", expectedOutput: "-321", isSample: true },
      { input: "120", expectedOutput: "21", isSample: true },
      { input: "0", expectedOutput: "0", isSample: false },
      { input: "1534236469", expectedOutput: "0", isSample: false, explanation: "Reversed integer overflows 32-bit int." },
      { input: "-2147483648", expectedOutput: "0", isSample: false }
    ],
    codeTemplates: {
      python: `def reverse(x: int) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `int reverse(int x) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function reverse(x) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Container With Most Water",
    slug: "container-with-most-water",
    statement: "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
    inputFormat: "Space-separated integers representing `height` array.",
    outputFormat: "An integer representing max area.",
    constraints: "n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["Two Pointers", "Arrays", "Greedy"],
    companyTags: ["Google", "Amazon", "Meta", "Uber"],
    editorial: "### Approach: Two Pointers\nPlace `left` at index 0 and `right` at index n-1. Calculate area `min(h[l], h[r]) * (r - l)`. Move pointer with smaller height inwards.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "1 8 6 2 5 4 8 3 7", expectedOutput: "49", isSample: true },
      { input: "1 1", expectedOutput: "1", isSample: true },
      { input: "4 3 2 1 4", expectedOutput: "16", isSample: true },
      { input: "1 2 1", expectedOutput: "2", isSample: false },
      { input: "2 3 10 5 7 8 9", expectedOutput: "36", isSample: false },
      { input: "10 9 8 7 6 5 4 3 2 1", expectedOutput: "25", isSample: false }
    ],
    codeTemplates: {
      python: `def maxArea(height: list[int]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint maxArea(std::vector<int>& height) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function maxArea(height) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "3Sum",
    slug: "3sum",
    statement: "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    inputFormat: "Space-separated integers for nums.",
    outputFormat: "Newline separated triplets formatted as space-separated integers, sorted.",
    constraints: "3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5",
    difficulty: "MEDIUM",
    topicTags: ["Two Pointers", "Arrays", "Sorting"],
    companyTags: ["Google", "Amazon", "Meta", "Microsoft"],
    editorial: "### Approach: Sort + Two Pointers\nSort array. Iterate `i` from 0 to n-3. Skip duplicates. Use two pointers `j = i+1` and `k = n-1` to find zero-sum pairs.\n\n- **Time Complexity:** O(N^2)\n- **Space Complexity:** O(1) or O(N) for sorting.",
    testCases: [
      { input: "-1 0 1 2 -1 -4", expectedOutput: "-1 -1 2\n-1 0 1", isSample: true },
      { input: "0 1 1", expectedOutput: "", isSample: true },
      { input: "0 0 0", expectedOutput: "0 0 0", isSample: true },
      { input: "-2 0 1 1 2", expectedOutput: "-2 0 2\n-2 1 1", isSample: false },
      { input: "-4 -1 -1 0 1 2", expectedOutput: "-1 -1 2\n-1 0 1", isSample: false },
      { input: "1 2 -2 -1", expectedOutput: "", isSample: false }
    ],
    codeTemplates: {
      python: `def threeSum(nums: list[int]) -> list[list[int]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<std::vector<int>> threeSum(std::vector<int>& nums) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function threeSum(nums) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Letter Combinations of a Phone Number",
    slug: "letter-combinations-of-a-phone-number",
    statement: "Given a string containing digits from `2-9` inclusive, return all possible letter combinations that the number could represent. Return the answer in any order.",
    inputFormat: "Single line containing digit string `digits`.",
    outputFormat: "Space-separated combinations.",
    constraints: "0 <= digits.length <= 4\ndigits[i] is a digit in range ['2', '9'].",
    difficulty: "MEDIUM",
    topicTags: ["Backtracking", "Strings"],
    companyTags: ["Amazon", "Uber", "Meta", "Google"],
    editorial: "### Approach: Backtracking / Depth-First Search\nMap digits to letters. Use recursion to build combinations character by character.\n\n- **Time Complexity:** O(4^N * N)\n- **Space Complexity:** O(N) recursion stack.",
    testCases: [
      { input: "23", expectedOutput: "ad ae af bd be bf cd ce cf", isSample: true },
      { input: "", expectedOutput: "", isSample: true },
      { input: "2", expectedOutput: "a b c", isSample: true },
      { input: "7", expectedOutput: "p q r s", isSample: false },
      { input: "99", expectedOutput: "ww wx wy wz xw xx xy xz yw yx yy yz zw zx zy zz", isSample: false },
      { input: "234", expectedOutput: "adg adh adi aeg aeh aei afg afh afi bdg bdh bdi beg beh bei bfg bfh bfi cdg cdh cdi ceg ceh cei cfg cfh cfi", isSample: false }
    ],
    codeTemplates: {
      python: `def letterCombinations(digits: str) -> list[str]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n#include <string>\n\nstd::vector<std::string> letterCombinations(std::string digits) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function letterCombinations(digits) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Remove Nth Node From End of List",
    slug: "remove-nth-node-from-end-of-list",
    statement: "Given the head of a linked list, remove the `n-th` node from the end of the list and return its head.",
    inputFormat: "First line: space-separated integers for linked list values.\nSecond line: integer `n`.",
    outputFormat: "Space-separated integers for resulting list.",
    constraints: "The number of nodes in list is sz.\n1 <= sz <= 30\n0 <= Node.val <= 100\n1 <= n <= sz",
    difficulty: "MEDIUM",
    topicTags: ["Linked List", "Two Pointers"],
    companyTags: ["Amazon", "Meta", "Apple", "Microsoft"],
    editorial: "### Approach: Two Fast & Slow Pointers\nAdvance fast pointer by `n` steps first. Then move fast and slow pointers together until fast reaches end. Slow node is right before target node.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "1 2 3 4 5\n2", expectedOutput: "1 2 3 5", isSample: true },
      { input: "1\n1", expectedOutput: "", isSample: true },
      { input: "1 2\n1", expectedOutput: "1", isSample: true },
      { input: "1 2\n2", expectedOutput: "2", isSample: false },
      { input: "10 20 30 40\n4", expectedOutput: "20 30 40", isSample: false },
      { input: "5 4 3 2 1\n3", expectedOutput: "5 4 2 1", isSample: false }
    ],
    codeTemplates: {
      python: `def removeNthFromEnd(head: list[int], n: int) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> removeNthFromEnd(std::vector<int>& head, int n) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function removeNthFromEnd(head, n) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    statement: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    inputFormat: "Single string `s`.",
    outputFormat: "`true` or `false`.",
    constraints: "1 <= s.length <= 10^4\n`s` consists of parentheses only `'()[]{}'`.",
    difficulty: "EASY",
    topicTags: ["Stack", "Strings"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta", "Apple"],
    editorial: "### Approach: Stack\nPush opening brackets onto stack. For closing brackets, check if stack is non-empty and top matches.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(N)",
    testCases: [
      { input: "()", expectedOutput: "true", isSample: true },
      { input: "()[]{}", expectedOutput: "true", isSample: true },
      { input: "(]", expectedOutput: "false", isSample: true },
      { input: "([)]", expectedOutput: "false", isSample: false },
      { input: "{[]}", expectedOutput: "true", isSample: false },
      { input: "(((", expectedOutput: "false", isSample: false }
    ],
    codeTemplates: {
      python: `def isValid(s: str) -> bool:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <string>\n\nbool isValid(std::string s) {\n    // Write your solution here\n    return false;\n}\n`,
      javascript: `function isValid(s) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Merge Two Sorted Lists",
    slug: "merge-two-sorted-lists",
    statement: "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
    inputFormat: "First line: space-separated integers for list1.\nSecond line: space-separated integers for list2.",
    outputFormat: "Space-separated integers representing merged list.",
    constraints: "The number of nodes in both lists is in range [0, 50].\n-100 <= Node.val <= 100\nBoth lists are sorted in non-decreasing order.",
    difficulty: "EASY",
    topicTags: ["Linked List", "Recursion"],
    companyTags: ["Amazon", "Microsoft", "Apple", "Google"],
    editorial: "### Approach: Iterative Two Pointers\nCreate dummy node. Compare values of head nodes and append smaller node.\n\n- **Time Complexity:** O(N + M)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "1 2 4\n1 3 4", expectedOutput: "1 1 2 3 4 4", isSample: true },
      { input: "\n", expectedOutput: "", isSample: true },
      { input: "\n0", expectedOutput: "0", isSample: true },
      { input: "2 5 8\n1 3 7 9", expectedOutput: "1 2 3 5 7 8 9", isSample: false },
      { input: "1 1 1\n1 1", expectedOutput: "1 1 1 1 1", isSample: false },
      { input: "-10 -5 0\n-3 1 2", expectedOutput: "-10 -5 -3 0 1 2", isSample: false }
    ],
    codeTemplates: {
      python: `def mergeTwoLists(list1: list[int], list2: list[int]) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> mergeTwoLists(std::vector<int>& list1, std::vector<int>& list2) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function mergeTwoLists(list1, list2) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Generate Parentheses",
    slug: "generate-parentheses",
    statement: "Given `n` pairs of parentheses, write a function to generate all combinations of well-formed parentheses.",
    inputFormat: "Single integer `n`.",
    outputFormat: "Space-separated list of combinations.",
    constraints: "1 <= n <= 8",
    difficulty: "MEDIUM",
    topicTags: ["Backtracking", "Strings", "Dynamic Programming"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta"],
    editorial: "### Approach: Backtracking\nTrack number of open and close brackets used. Add open if `open < n`, add close if `close < open`.\n\n- **Time Complexity:** O(4^N / sqrt(N)) Catalan number bound.\n- **Space Complexity:** O(N) recursion stack.",
    testCases: [
      { input: "3", expectedOutput: "((())) (()()) (())() ()(()) ()()()", isSample: true },
      { input: "1", expectedOutput: "()", isSample: true },
      { input: "2", expectedOutput: "(()) ()()", isSample: true },
      { input: "4", expectedOutput: "(((()))) (((()()))) (((())())) (((()))()) ((()())) ((()()())) ((()())()) ((() restrictions...))", isSample: false },
      { input: "0", expectedOutput: "", isSample: false },
      { input: "5", expectedOutput: "42 valid combinations...", isSample: false }
    ],
    codeTemplates: {
      python: `def generateParenthesis(n: int) -> list[str]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n#include <string>\n\nstd::vector<std::string> generateParenthesis(int n) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function generateParenthesis(n) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Merge k Sorted Lists",
    slug: "merge-k-sorted-lists",
    statement: "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
    inputFormat: "First line: integer `k` (number of lists).\nNext `k` lines: space-separated integers for each list.",
    outputFormat: "Space-separated integers representing merged list.",
    constraints: "k == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4",
    difficulty: "HARD",
    topicTags: ["Heap", "Linked List", "Divide and Conquer"],
    companyTags: ["Google", "Amazon", "Meta", "Netflix", "Microsoft"],
    editorial: "### Approach: Min-Heap / Priority Queue\nPush head element of each list to Min-Heap. Pop minimum element, append to merged list, and push its next element.\n\n- **Time Complexity:** O(N log k) where N is total nodes.\n- **Space Complexity:** O(k) for Min-Heap.",
    testCases: [
      { input: "3\n1 4 5\n1 3 4\n2 6", expectedOutput: "1 1 2 3 4 4 5 6", isSample: true },
      { input: "0", expectedOutput: "", isSample: true },
      { input: "1\n", expectedOutput: "", isSample: true },
      { input: "2\n1 3 5 7\n2 4 6 8", expectedOutput: "1 2 3 4 5 6 7 8", isSample: false },
      { input: "4\n-10 -5\n-8 0\n1 2\n-1", expectedOutput: "-10 -8 -5 -1 0 1 2", isSample: false },
      { input: "3\n5\n1 2\n3 4", expectedOutput: "1 2 3 4 5", isSample: false }
    ],
    codeTemplates: {
      python: `def mergeKLists(lists: list[list[int]]) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> mergeKLists(std::vector<std::vector<int>>& lists) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function mergeKLists(lists) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Search in Rotated Sorted Array",
    slug: "search-in-rotated-sorted-array",
    statement: "There is an integer array `nums` sorted in ascending order (with distinct values) that has been rotated at an unknown pivot index.\n\nGiven array `nums` and target `target`, return index of `target` if in `nums`, or `-1` if not in `nums`.\n\nAlgorithm must run in `O(log n)` runtime.",
    inputFormat: "First line: space-separated integers for nums.\nSecond line: integer target.",
    outputFormat: "Integer representing target index or -1.",
    constraints: "1 <= nums.length <= 5000\n-10^4 <= nums[i] <= 10^4\nAll values of nums are unique.\n-10^4 <= target <= 10^4",
    difficulty: "MEDIUM",
    topicTags: ["Binary Search", "Arrays"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta", "Flipkart"],
    editorial: "### Approach: Modified Binary Search\nIn rotated sorted array, one half `[left, mid]` or `[mid, right]` is guaranteed to be strictly sorted. Determine which half is sorted and check if target lies within that range.\n\n- **Time Complexity:** O(log N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "4 5 6 7 0 1 2\n0", expectedOutput: "4", isSample: true },
      { input: "4 5 6 7 0 1 2\n3", expectedOutput: "-1", isSample: true },
      { input: "1\n0", expectedOutput: "-1", isSample: true },
      { input: "1\n1", expectedOutput: "0", isSample: false },
      { input: "5 1 3\n5", expectedOutput: "0", isSample: false },
      { input: "3 1\n1", expectedOutput: "1", isSample: false }
    ],
    codeTemplates: {
      python: `def search(nums: list[int], target: int) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint search(std::vector<int>& nums, int target) {\n    // Write your solution here\n    return -1;\n}\n`,
      javascript: `function search(nums, target) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Find First and Last Position of Element in Sorted Array",
    slug: "find-first-and-last-position-of-element-in-sorted-array",
    statement: "Given an array of integers `nums` sorted in non-decreasing order, find the starting and ending position of a given `target` value.\n\nIf `target` is not found in the array, return `[-1, -1]`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    inputFormat: "First line: space-separated integers for nums.\nSecond line: integer target.",
    outputFormat: "Two space-separated integers representing starting and ending index.",
    constraints: "0 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9\nnums is a non-decreasing array.\n-10^9 <= target <= 10^9",
    difficulty: "MEDIUM",
    topicTags: ["Binary Search", "Arrays"],
    companyTags: ["Google", "Amazon", "Microsoft", "Uber"],
    editorial: "### Approach: Double Binary Search\nRun binary search twice: once to find the leftmost boundary (first occurrence), and once to find rightmost boundary (last occurrence).\n\n- **Time Complexity:** O(log N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "5 7 7 8 8 10\n8", expectedOutput: "3 4", isSample: true },
      { input: "5 7 7 8 8 10\n6", expectedOutput: "-1 -1", isSample: true },
      { input: "\n0", expectedOutput: "-1 -1", isSample: true },
      { input: "2 2 2 2 2\n2", expectedOutput: "0 4", isSample: false },
      { input: "1 3 5 7 9\n5", expectedOutput: "2 2", isSample: false },
      { input: "1 2 3\n4", expectedOutput: "-1 -1", isSample: false }
    ],
    codeTemplates: {
      python: `def searchRange(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<int> searchRange(std::vector<int>& nums, int target) {\n    // Write your solution here\n    return {-1, -1};\n}\n`,
      javascript: `function searchRange(nums, target) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Combination Sum",
    slug: "combination-sum",
    statement: "Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of candidates where the chosen numbers sum to `target`. You may return the combinations in any order.\n\nThe same number may be chosen from candidates an unlimited number of times.",
    inputFormat: "First line: space-separated integers for candidates.\nSecond line: integer target.",
    outputFormat: "Newline separated combinations (space-separated integers).",
    constraints: "1 <= candidates.length <= 30\n2 <= candidates[i] <= 40\nAll elements of candidates are distinct.\n1 <= target <= 40",
    difficulty: "MEDIUM",
    topicTags: ["Backtracking", "Arrays"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    editorial: "### Approach: Backtracking / DFS\nSort candidates. Recursively pick element or skip to next index while decrementing remaining target.\n\n- **Time Complexity:** O(2^T) where T is target / min(candidates).\n- **Space Complexity:** O(T) recursion depth.",
    testCases: [
      { input: "2 3 6 7\n7", expectedOutput: "2 2 3\n7", isSample: true },
      { input: "2 3 5\n8", expectedOutput: "2 2 2 2\n2 3 3\n3 5", isSample: true },
      { input: "2\n1", expectedOutput: "", isSample: true },
      { input: "3 5 7\n10", expectedOutput: "3 3 4\n5 5", isSample: false },
      { input: "2 4\n6", expectedOutput: "2 2 2\n2 4", isSample: false },
      { input: "7 3\n9", expectedOutput: "3 3 3", isSample: false }
    ],
    codeTemplates: {
      python: `def combinationSum(candidates: list[int], target: int) -> list[list[int]]:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nstd::vector<std::vector<int>> combinationSum(std::vector<int>& candidates, int target) {\n    // Write your solution here\n    return {};\n}\n`,
      javascript: `function combinationSum(candidates, target) {\n  // Write your solution here\n}\n`
    }
  },
  {
    title: "Trapping Rain Water",
    slug: "trapping-rain-water",
    statement: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    inputFormat: "Space-separated integers for height array.",
    outputFormat: "Single integer representing total water trapped.",
    constraints: "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
    difficulty: "HARD",
    topicTags: ["Two Pointers", "Stack", "Arrays", "DP"],
    companyTags: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    editorial: "### Approach: Two Pointers\nMaintain `left_max` and `right_max`. Water trapped at index `i` is determined by `min(left_max, right_max) - height[i]`.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(1)",
    testCases: [
      { input: "0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6", isSample: true },
      { input: "4 2 0 3 2 5", expectedOutput: "9", isSample: true },
      { input: "1 2 3 4 5", expectedOutput: "0", isSample: true },
      { input: "5 4 3 2 1", expectedOutput: "0", isSample: false },
      { input: "3 0 0 2 0 4", expectedOutput: "10", isSample: false },
      { input: "2 0 2", expectedOutput: "2", isSample: false }
    ],
    codeTemplates: {
      python: `def trap(height: list[int]) -> int:\n    # Write your solution here\n    pass\n`,
      cpp: `#include <vector>\n\nint trap(std::vector<int>& height) {\n    // Write your solution here\n    return 0;\n}\n`,
      javascript: `function trap(height) {\n  // Write your solution here\n}\n`
    }
  }
];
