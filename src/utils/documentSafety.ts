const MANDATORY_DISCLAIMER = 'Please consult a professional for confirmation.';
const UNCERTAINTY_MESSAGE = 'I cannot read this clearly. Please move closer or hold steady.';

export function formatDocumentResponse(
  response: string,
  documentType: string,
  confidence: number = 1.0
): string {
  if (confidence < 0.8) {
    return UNCERTAINTY_MESSAGE;
  }

  const normalizedType = documentType.toLowerCase();
  const needsDisclaimer = 
    normalizedType.includes('medical') || 
    normalizedType.includes('government') ||
    normalizedType.includes('legal') ||
    normalizedType.includes('tax');

  if (needsDisclaimer) {
    return `${response} ${MANDATORY_DISCLAIMER}`;
  }

  return response;
}
