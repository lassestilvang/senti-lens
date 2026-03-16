/**
 * @jest-environment node
 */
import { searchMedicationDatabase, verifyMedicationInfo } from './medicationGrounding';
import { MedicationInfo } from './medicationOCR';

describe('Medication Grounding Service', () => {
  describe('searchMedicationDatabase', () => {
    it('should return verified medication data for a valid query', async () => {
      const query = 'Ibuprofen 400mg';
      const result = await searchMedicationDatabase(query);

      expect(result).toHaveProperty('verifiedName');
      expect(result).toHaveProperty('verifiedStrength');
      expect(result).toHaveProperty('officialDosageInstructions');
      expect(result).toHaveProperty('source');
      expect(result.verifiedName.toLowerCase()).toContain('ibuprofen');
    });

    it('should throw error for empty query', async () => {
      await expect(searchMedicationDatabase('')).rejects.toThrow('Search query is required');
    });
  });

  describe('verifyMedicationInfo', () => {
    it('should return a match if OCR data aligns with grounded database data', async () => {
      const ocrData: MedicationInfo = {
        name: 'Ibuprofen',
        strength: '400mg',
        dosage: 'Take 1 tablet every 4 hours',
        confidence: 0.98
      };

      const result = await verifyMedicationInfo(ocrData);
      
      expect(result.isVerified).toBe(true);
      expect(result.groundedData).toBeDefined();
    });

    it('should return isVerified false and a warning if external grounding fails', async () => {
      const ocrData: MedicationInfo = {
        name: 'UnknownMed',
        strength: '10mg',
        dosage: 'Once daily',
        confidence: 0.98
      };

      const result = await verifyMedicationInfo(ocrData);
      
      expect(result.isVerified).toBe(false);
      expect(result.warning).toContain('could not be completed');
    });
  });
});
