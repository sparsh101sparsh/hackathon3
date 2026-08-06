type TutorFallbackOptions = {
  title: string;
  language: string;
  userCode: string;
  userMessage: string;
  context: string;
};

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function extractTemplate(context: string, language: string) {
  const escapedLanguage = language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = context.match(new RegExp(`Reference solution template \\(${escapedLanguage}\\):\\n([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n]*:|$)`, 'i'));
  return match?.[1]?.trim() || '';
}

function isStarterTemplate(template: string) {
  return !template || /\b(pass|todo|write your solution|implement here|your code here)\b/i.test(template);
}

function knownCompleteSolution(title: string, language: string) {
  if (title.toLowerCase() !== 'number of islands') return '';
  if (language.toLowerCase() === 'python' || language.toLowerCase() === 'python3') {
    return `def numIslands(grid):
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    islands = 0

    for row in range(rows):
        for col in range(cols):
            if grid[row][col] != '1':
                continue
            islands += 1
            stack = [(row, col)]
            grid[row][col] = '0'
            while stack:
                current_row, current_col = stack.pop()
                for next_row, next_col in ((current_row - 1, current_col), (current_row + 1, current_col), (current_row, current_col - 1), (current_row, current_col + 1)):
                    if 0 <= next_row < rows and 0 <= next_col < cols and grid[next_row][next_col] == '1':
                        grid[next_row][next_col] = '0'
                        stack.append((next_row, next_col))

    return islands`;
  }
  if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js') {
    return `function numIslands(grid) {
  if (!grid.length) return 0;
  let islands = 0;
  const rows = grid.length;
  const cols = grid[0].length;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (grid[row][col] !== '1') continue;
      islands += 1;
      const stack = [[row, col]];
      grid[row][col] = '0';
      while (stack.length) {
        const [currentRow, currentCol] = stack.pop();
        for (const [nextRow, nextCol] of [[currentRow - 1, currentCol], [currentRow + 1, currentCol], [currentRow, currentCol - 1], [currentRow, currentCol + 1]]) {
          if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols && grid[nextRow][nextCol] === '1') {
            grid[nextRow][nextCol] = '0';
            stack.push([nextRow, nextCol]);
          }
        }
      }
    }
  }
  return islands;
}`;
  }
  return '';
}

export function buildTutorFallbackReply(options: TutorFallbackOptions): string {
  const message = options.userMessage.trim();
  const normalized = message.toLowerCase();
  const title = options.title || 'this problem';
  const language = options.language || 'cpp';
  const template = extractTemplate(options.context, language);

  if (hasAny(normalized, ['whole code', 'full code', 'write the code', 'give me code', 'code for', 'implementation', 'solution code'])) {
    const completeSolution = isStarterTemplate(template) ? knownCompleteSolution(title, language) : template;
    if (completeSolution) {
      return `Here is the ${language} implementation for **${title}**:\n\n\`\`\`${language}\n${completeSolution}\n\`\`\`\n\nRun it against the sample cases first. Then I can walk through any line or adapt it to your current code.`;
    }
    return `The available ${language} file for **${title}** is only a starter template, not a complete solution. The tutor provider is currently unavailable, so I will not pretend that skeleton is finished. Share the function signature or retry once the tutor service is online.`;
  }

  if (hasAny(normalized, ['error', 'bug', 'wrong', 'fail', 'not working', 'issue'])) {
    return `Let us debug **${title}** from the actual failure. Paste the compiler/runtime output and the smallest input that reproduces it. I will trace the failing state against your ${language} code instead of guessing.`;
  }

  if (hasAny(normalized, ['complexity', 'optimize', 'faster', 'time', 'space'])) {
    return `For **${title}**, first identify the repeated operation in your current approach. Count how often it runs as the input grows, then check whether a hash table, monotonic structure, sorting step, or dynamic-programming state can remove that repetition. Share the current code and I will calculate its exact time and space complexity.`;
  }

  if (hasAny(normalized, ['edge case', 'test case', 'example', 'input'])) {
    return `For **${title}**, test the smallest valid input, an empty or singleton input when allowed, duplicate values, boundary values, and the case where no answer exists. Tell me which case is confusing and I will trace it step by step using the canonical examples.`;
  }

  if (hasAny(normalized, ['hint', 'clue', 'stuck', 'where do i start'])) {
    return `Start with the invariant for **${title}**: what must remain true after each iteration? State what your pointer, frontier, or table means before changing it. Share your first attempt and I will give one targeted hint without jumping to the solution.`;
  }

  if (options.userCode.trim()) {
    return `I can see your current ${language} attempt for **${title}**. Tell me whether you want a correctness trace, complexity review, debugging help, or a complete implementation, and I will focus on that specific request.`;
  }

  return `I’m ready to help with **${title}**. Ask for a hint, a correctness trace, complexity analysis, edge cases, or the complete ${language} implementation, and I’ll answer that specific request.`;
}
