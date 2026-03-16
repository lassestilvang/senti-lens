/**
 * @jest-environment node
 */
import { getMedicationPrompt, isConfidenceHighEnough, extractMedicationInfo } from './medicationOCR';

describe('Medication OCR Utilities', () => {
  describe('getMedicationPrompt', () => {
    it('should return a prompt that includes specific instructions for medication labels', () => {
      const prompt = getMedicationPrompt();
      expect(prompt).toContain('medication name');
      expect(prompt).toContain('strength');
      expect(prompt).toContain('dosage instructions');
      expect(prompt).toContain('CRITICAL RULES');
    });
  });

  describe('isConfidenceHighEnough', () => {
    it('should return true if confidence is >= 0.95', () => {
      expect(isConfidenceHighEnough(0.95)).toBe(true);
      expect(isConfidenceHighEnough(0.99)).toBe(true);
    });

    it('should return false if confidence is < 0.95', () => {
      expect(isConfidenceHighEnough(0.94)).toBe(false);
      expect(isConfidenceHighEnough(0.5)).toBe(false);
    });
  });

  describe('extractMedicationInfo', () => {
    it('should return extracted medication info from a base64 image', async () => {
      const mockImage = 'base64-image-data';
      const result = await extractMedicationInfo(mockImage);
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('dosage');
      expect(result).toHaveProperty('confidence');
    });

    it('should throw error if image is missing', async () => {
      await expect(extractMedicationInfo('')).rejects.toThrow('Image data is required');
    });
  });
});
