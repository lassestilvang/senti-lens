/**
 * @jest-environment node
 */
import { formatMedicationResponse } from './medicationSafety';
import { MedicationInfo } from './medicationOCR';

describe('Medication Safety Utilities - formatMedicationResponse', () => {
  const baseInfo: MedicationInfo = {
    name: 'Ibuprofen',
    strength: '400mg',
    dosage: 'Take 1 tablet every 4 hours',
    confidence: 0.98
  };

  it('should append a mandatory medical disclaimer to the response', () => {
    const response = 'You should take one tablet.';
    const formatted = formatMedicationResponse(response, baseInfo);
    
    expect(formatted).toContain(response);
    expect(formatted).toContain('Please consult your doctor or pharmacist');
  });

  it('should return a refusal message if OCR confidence is below 0.95', () => {
    const lowConfidenceInfo = { ...baseInfo, confidence: 0.90 };
    const formatted = formatMedicationResponse('Some response', lowConfidenceInfo);
    
    expect(formatted).toBe('I cannot read the dosage clearly, please do not guess.');
  });

  it('should return a refusal message if OCR text indicates it is blurry or obscured', () => {
    const blurryInfo = { ...baseInfo, dosage: 'I cannot read this clearly' };
    const formatted = formatMedicationResponse('Some response', blurryInfo);
    
    expect(formatted).toBe('I cannot read the dosage clearly, please do not guess.');
  });

  it('should return a refusal message if the response implies medical advice not on the label', () => {
    // This is a simplified check for the MVP mock
    const adviceResponse = 'You should also take this with a glass of milk for better absorption.';
    const formatted = formatMedicationResponse(adviceResponse, baseInfo);
    
    expect(formatted).toBe('I can only provide information explicitly stated on the medication label.');
  });
});
