const GOAL_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'find',
  'help',
  'i',
  'is',
  'it',
  'look',
  'looking',
  'me',
  'my',
  'need',
  'please',
  'the',
  'to',
  'we',
]);

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 2 && !GOAL_STOP_WORDS.has(token));
}

function singularize(token: string): string {
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('es') && token.length > 3) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Finds the first object that appears relevant to the current user goal.
 * Uses lightweight keyword overlap so goals like "find my baseball" can
 * still match object labels such as "baseball glove".
 */
export function findGoalObjectMatch(goal: string, objects: string[]): string | null {
  if (!goal || objects.length === 0) {
    return null;
  }

  const goalTokens = tokenize(goal);
  if (goalTokens.length === 0) {
    return null;
  }

  const goalTokenSet = new Set<string>();
  for (const token of goalTokens) {
    goalTokenSet.add(token);
    goalTokenSet.add(singularize(token));
  }

  for (const object of objects) {
    const normalizedObject = object.toLowerCase();
    const objectTokens = tokenize(object);

    if (objectTokens.some((token) => goalTokenSet.has(token) || goalTokenSet.has(singularize(token)))) {
      return object;
    }

    for (const goalToken of goalTokenSet) {
      if (normalizedObject.includes(goalToken)) {
        return object;
      }
    }
  }

  return null;
}
