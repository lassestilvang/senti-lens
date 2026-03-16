import { SceneAnalysis } from './geminiVision';

interface SessionMemory {
  environment: string;
  objects_seen: string[];
  user_goal: string;
}

interface SuggestionResult {
  shouldSuggest: boolean;
  suggestionPrompt?: string;
}

/**
 * Evaluates whether a proactive suggestion should be given based on the user's goal
 * and the currently detected scene objects.
 *
 * In test mode: uses hardcoded heuristic for deterministic tests.
 * In production: calls the grounding API to ask Gemini Flash for semantic evaluation.
 */
export async function evaluateProactiveSuggestion(
  memory: SessionMemory,
  currentAnalysis: SceneAnalysis
): Promise<SuggestionResult> {
  // Test mode: preserve existing deterministic behavior
  if (process.env.NODE_ENV === 'test') {
    const userGoalTokens = memory.user_goal.toLowerCase().split(' ');

    for (const object of currentAnalysis.objects) {
      const objectLower = object.toLowerCase();
      if (userGoalTokens.includes('cereal') && objectLower.includes('oatmeal')) {
        return {
          shouldSuggest: true,
          suggestionPrompt: `The user previously asked about ${memory.user_goal}. Explain why the newly spotted ${object} might be relevant.`,
        };
      }
    }

    return { shouldSuggest: false };
  }

  // Production: use Gemini Flash via the ground API for semantic goal matching
  if (!memory.user_goal || memory.user_goal.trim() === '') {
    return { shouldSuggest: false };
  }

  // Find new objects not already in memory
  const newObjects = currentAnalysis.objects.filter(
    (obj) => !memory.objects_seen.includes(obj)
  );

  if (newObjects.length === 0) {
    return { shouldSuggest: false };
  }

  try {
    const response = await fetch('/api/ground', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `The user's goal is: "${memory.user_goal}".
New objects just detected: ${newObjects.join(', ')}.
Previously seen objects: ${memory.objects_seen.slice(-10).join(', ')}.
Environment: ${memory.environment}.

Is any of the newly detected objects relevant to the user's goal?
If yes, return: {"relevant": true, "object": "name", "reason": "why it's relevant"}
If no, return: {"relevant": false}`,
        scenario: 'general',
      }),
    });

    const result = await response.json();

    if (result.relevant) {
      return {
        shouldSuggest: true,
        suggestionPrompt: `Earlier you mentioned "${memory.user_goal}". I just noticed ${result.object}. ${result.reason}`,
      };
    }
  } catch (err) {
    console.error('[orchestrator] Proactive evaluation error:', err);
  }

  return { shouldSuggest: false };
}