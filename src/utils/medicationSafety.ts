import { MedicationInfo, MIN_CONFIDENCE_THRESHOLD } from '../services/medicationOCR';

const MANDATORY_DISCLAIMER = 'Please consult your doctor or pharmacist to be sure.';
const CONFIDENCE_REFUSAL = 'I cannot read the dosage clearly, please do not guess.';
const ADVICE_REFUSAL = 'I can only provide information explicitly stated on the medication label.';

/**
 * Formats the AI response for medication queries, applying safety rules and disclaimers.
 * @param response The candidate response from the LLM
 * @param ocrInfo The extracted medication information for validation
 * @returns The safe, formatted response string
 */
export function formatMedicationResponse(response: string, ocrInfo: MedicationInfo): string {
  // Rule 1: High Confidence Check
  if (ocrInfo.confidence < MIN_CONFIDENCE_THRESHOLD) {
    return CONFIDENCE_REFUSAL;
  }

  // Rule 1.5: Blurriness text check from OCR
  const isBlurry = [ocrInfo.name, ocrInfo.strength, ocrInfo.dosage].some(field => 
    field && field.toLowerCase().includes('cannot read this clearly')
  );
  if (isBlurry) {
    return CONFIDENCE_REFUSAL;
  }

  // Rule 2: Limited Advice Scope Check (Simulated for MVP)
  // In a real system, we'd use a safety agent to verify the response against the label.
  const unauthorizedKeywords = ['milk', 'food', 'interaction', 'better absorption'];
  const includesUnauthorizedAdvice = unauthorizedKeywords.some(keyword => 
    response.toLowerCase().includes(keyword)
  );

  if (includesUnauthorizedAdvice) {
    return ADVICE_REFUSAL;
  }

  // Rule 3: Append Mandatory Disclaimer
  return `${response} ${MANDATORY_DISCLAIMER}`;
}
