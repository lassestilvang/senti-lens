/**
 * Generates a prompt for spatial reasoning based on detected safety objects and scene context.
 * @param safetyObjects List of identified safety-critical objects.
 * @param context General description of the environment.
 * @returns A formatted prompt string for Gemini 2.0 Flash.
 */
export function getSpatialReasoningPrompt(safetyObjects: string[], context: string): string {
  return `
You are an AI assistant helping a user navigate their environment safely.
Context: ${context}
Detected Objects: ${safetyObjects.join(', ')}

Please provide a concise spatial reasoning assessment. 
Identify if any detected objects represent an immediate hazard.
Describe the layout of the scene relative to the user.
Focus on situational safety and clear directions.
`;
}
