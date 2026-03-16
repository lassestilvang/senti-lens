/**
 * Central error handling and fallback logic for SentiLens.
 *
 * Implements the failure-mode response matrix from idea.md section 18.3.
 */

export interface FallbackResult {
  shouldFallback: boolean;
  userMessage: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Handles frame quality issues.
 */
export function handleFrameQuality(confidence: number, isBlurry?: boolean): FallbackResult {
  if (isBlurry || confidence < 0.5) {
    return {
      shouldFallback: true,
      userMessage: 'I cannot see enough detail yet. Please move closer or hold the camera steady.',
      severity: 'warning',
    };
  }

  if (confidence < 0.7) {
    return {
      shouldFallback: false,
      userMessage: 'Image quality is low. Results may be less accurate.',
      severity: 'info',
    };
  }

  return { shouldFallback: false, userMessage: '', severity: 'info' };
}

/**
 * Handles service errors with appropriate fallback messages.
 */
export function handleServiceError(serviceName: string, error: unknown): FallbackResult {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[FallbackHandler] ${serviceName} error:`, errorMessage);

  switch (serviceName) {
    case 'vision':
      return {
        shouldFallback: true,
        userMessage: 'I am still analyzing. Please try again in a moment.',
        severity: 'warning',
      };

    case 'grounding':
      return {
        shouldFallback: false,
        userMessage: 'I could not verify this online right now. This answer is based only on visible text.',
        severity: 'info',
      };

    case 'voice':
      return {
        shouldFallback: true,
        userMessage: 'Voice connection lost. Reconnecting...',
        severity: 'warning',
      };

    case 'memory':
      // Memory errors are non-critical — fall back to in-memory state
      return {
        shouldFallback: false,
        userMessage: '',
        severity: 'info',
      };

    default:
      return {
        shouldFallback: true,
        userMessage: 'Something went wrong. Please try again.',
        severity: 'critical',
      };
  }
}

/**
 * Handles conflicting evidence between visual analysis and grounding.
 */
export function handleConflictingEvidence(visualClaim: string, groundedClaim: string): FallbackResult {
  return {
    shouldFallback: false,
    userMessage: `I see conflicting information. Visual text says "${visualClaim}" but verification suggests "${groundedClaim}". Please check the label again for a safer answer.`,
    severity: 'warning',
  };
}

/**
 * Handles latency spikes — returns partial results.
 */
export function handleLatencySpike(partialResults: string[], elapsedMs: number): FallbackResult {
  if (elapsedMs > 3000) {
    return {
      shouldFallback: true,
      userMessage: `I am still analyzing. Here is what I can confirm so far: ${partialResults.join(', ')}.`,
      severity: 'info',
    };
  }

  return { shouldFallback: false, userMessage: '', severity: 'info' };
}

/**
 * Determines appropriate reconnection delay using exponential backoff.
 */
export function getReconnectDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Cap at 30 seconds
}
