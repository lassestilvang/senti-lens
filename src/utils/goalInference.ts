/**
 * Extracts a likely search target from a natural-language visual query.
 * Returns null when no clear object target can be inferred.
 */
export function inferGoalFromQuestion(question: string): string | null {
  const normalized = question.toLowerCase().trim();
  if (!normalized) {
    return null;
  }

  const genericPhrases = new Set([
    'anything',
    'anything else',
    'right now',
    'there',
    'this',
    'that',
  ]);

  const patterns = [
    /(?:where(?:'s| is)|find|locate|look for|spot|do you see)\s+(?:the|a|an|my)?\s*([a-z0-9][a-z0-9\s-]{1,40})/,
    /(?:is there|can you see)\s+(?:the|a|an)?\s*([a-z0-9][a-z0-9\s-]{1,40})/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const cleaned = match[1]
      .replace(/\b(in|on|at|for|near|around)\b.*$/, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim();

    if (cleaned.length >= 3 && !genericPhrases.has(cleaned)) {
      return cleaned;
    }
  }

  return null;
}
