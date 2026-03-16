/**
 * Formats a conversational response with source attribution for grounded facts.
 * @param response The candidate response from the model
 * @param source The source of the grounded information (optional)
 * @returns An attributed response string
 */
export function formatAttributedResponse(response: string, source?: string): string {
  if (!source) {
    return response;
  }

  return `According to ${source}, ${response}`;
}
