import assert from 'node:assert/strict';
import { executeCode } from '@/lib/piston';

const sameTreeFunction = `#include <vector>
bool isSameTree(std::vector<int>& p, std::vector<int>& q) {
    if (p.size() != q.size()) return false;
    for (size_t i = 0; i < p.size(); i++) {
        if (p[i] != q[i]) return false;
    }
    return true;
}`;

const twoSumFunction = `#include <vector>
#include <unordered_map>
class Solution { public:
std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < static_cast<int>(nums.size()); i++) {
        if (seen.count(target - nums[i])) return {seen[target - nums[i]], i};
        seen[nums[i]] = i;
    }
    return {};
}
};`;

const stringFunction = `#include <string>
#include <unordered_map>
class Solution { public:
int lengthOfLongestSubstring(std::string s) {
    std::unordered_map<char, int> last; int left = 0, best = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        if (last.count(s[right])) left = std::max(left, last[s[right]] + 1);
        last[s[right]] = right; best = std::max(best, right - left + 1);
    }
    return best;
}
};`;

const matrixFunction = `#include <vector>
class Solution { public:
std::vector<int> spiralOrder(std::vector<std::vector<int>>& matrix) {
    std::vector<int> out; for (auto& row : matrix) for (int value : row) out.push_back(value); return out;
}
};`;

const charMatrixFunction = `#include <vector>
class Solution { public:
bool validSudoku(std::vector<std::vector<char>>& board) { return board.size() == 2 && board[0][0] == '5'; }
};`;

async function main() {
  const result = await executeCode('cpp', sameTreeFunction, '1 2 3\n1 2 3\n', 'same-tree');

  assert.equal(result.verdict, 'Accepted', `${result.verdict}: ${result.stderr}`);
  assert.equal(result.stdout, 'true', `unexpected output: ${result.stdout}`);

  const cases = [
    { code: twoSumFunction, input: '2 7 11 15\n9\n', output: '0 1' },
    { code: stringFunction, input: 's = "abcabcbb"\n', output: '3' },
    { code: matrixFunction, input: '3 3\n1 2 3\n4 5 6\n7 8 9\n', output: '1 2 3 4 5 6 7 8 9' },
    { code: charMatrixFunction, input: 'board = [["5","3"],[".","7"]]\n', output: 'true' },
  ];
  for (const testCase of cases) {
    const testResult = await executeCode('cpp', testCase.code, testCase.input, 'catalog-regression');
    assert.equal(testResult.verdict, 'Accepted', `${testResult.verdict}: ${testResult.stderr}`);
    assert.equal(testResult.stdout, testCase.output, `unexpected output: ${testResult.stdout}`);
  }
  console.log('Function-style C++ execution passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
