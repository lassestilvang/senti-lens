/**
 * @jest-environment node
 */
import { generateGroundedResponse } from './medicationOrchestration';
import { MedicationInfo } from '../services/medicationOCR';
import { GroundedMedicationData } from '../services/medicationGrounding';

describe('Medication Orchestration - generateGroundedResponse', () => {
  const ocrData: MedicationInfo = {
    name: 'Ibuprofen',
    strength: '400mg',
    dosage: 'Take 1 tablet every 4 hours',
    confidence: 0.98
  };

  const groundedData: GroundedMedicationData = {
    verifiedName: 'Ibuprofen',
    verifiedStrength: '400mg',
    officialDosageInstructions: 'Adults: 1 tablet every 4 to 6 hours. Do not exceed 6 tablets.',
    source: 'Grounded via DB'
  };

  it('should generate a response using both OCR and grounded data', () => {
    const result = generateGroundedResponse(ocrData, groundedData);
    
    expect(result).toContain('Ibuprofen');
    expect(result).toContain('Adults: 1 tablet every 4 to 6 hours');
    expect(result).toContain('Grounded via DB');
  });

  it('should include a warning if grounded data is missing', () => {
    const result = generateGroundedResponse(ocrData);
    expect(result).toContain('could not be completed');
  });
});
