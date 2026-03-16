/**
 * Handles grounding failures and returns appropriate fallback messages.
 * @param error The error encountered (if any)
 * @param scenario The current scenario ('medical', 'grocery', etc.)
 * @returns A safe fallback message for the user
 */
export function handleGroundingFallback(error: Error | null, scenario?: string): string {
  let message: string;

  if (error && error.message.toLowerCase().includes('time')) {
    message = 'External verification could not be completed in time. Please try again or rely on the visual label.';
  } else {
    message = 'No external verification records found for this item.';
  }

  if (scenario === 'medical') {
    message += ' This information could not be verified; please consult a professional for confirmation.';
  }

  return message;
}
