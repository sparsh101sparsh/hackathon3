/**
 * Competitive-programming output comparison ignores line endings and harmless
 * whitespace around common collection punctuation while preserving word
 * boundaries in textual answers.
 */
export function normalizeOutput(value: string): string {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim()
    .replace(/\s*,\s*/g, ',')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}');
  const tokens = collectionTokens(normalized);
  const numericCollection = tokens?.every((token) => /^[-+]?\d+(?:\.\d+)?$/.test(token));
  if (tokens && (/[\[\]{},]/.test(normalized) || numericCollection)) {
    return `[${tokens.join(',')}]`;
  }
  return normalized;
}

function collectionTokens(value: string): string[] | null {
  const trimmed = value.trim();
  if (!trimmed || !(/[\[\]{},]/.test(trimmed) || /\s/.test(trimmed))) return null;
  const tokens = trimmed
    .replace(/[\[\]{},]/g, ' ')
    .replace(/"/g, '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => /^[-+]?\d+(?:\.\d+)?$/.test(token) || /^[A-Za-z_.-]+$/.test(token))
    ? tokens
    : null;
}

/** Compares LeetCode-style collection output with whitespace-separated output. */
export function outputsEquivalent(actual: string, expected: string): boolean {
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);
  if (normalizedActual === normalizedExpected) return true;

  const actualTokens = collectionTokens(normalizedActual);
  const expectedTokens = collectionTokens(normalizedExpected);
  return Boolean(actualTokens && expectedTokens && actualTokens.join('\u0000') === expectedTokens.join('\u0000'));
}
