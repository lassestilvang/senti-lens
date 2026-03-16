/**
 * @jest-environment node
 */
import { analyzeEnvironment } from './geminiVision';

describe('geminiVision - analyzeEnvironment', () => {
  it('should extract safety-critical objects and scene context', async () => {
    const mockImage = 'base64-env-image';
    const result = await analyzeEnvironment(mockImage);

    expect(result).toHaveProperty('safetyObjects');
    expect(Array.isArray(result.safetyObjects)).toBe(true);
    expect(result).toHaveProperty('sceneContext');
    expect(result).toHaveProperty('confidence');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should throw error for empty image', async () => {
    await expect(analyzeEnvironment('')).rejects.toThrow('Invalid image data');
  });
});
