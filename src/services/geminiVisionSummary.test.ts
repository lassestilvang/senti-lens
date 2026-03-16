/**
 * @jest-environment node
 */
import { summarizeDocument } from './geminiVision';

describe('geminiVision - summarizeDocument', () => {
  it('should generate a summary from extracted text', async () => {
    const text = 'This is a medical bill for $150.00 from City Hospital. Due date is 2026-04-01.';
    const summary = await summarizeDocument(text);

    expect(summary).toHaveProperty('summary');
    expect(summary).toHaveProperty('keyPoints');
    expect(Array.isArray(summary.keyPoints)).toBe(true);
    expect(summary.summary.length).toBeGreaterThan(0);
  });

  it('should throw error for empty text', async () => {
    await expect(summarizeDocument('')).rejects.toThrow('No text provided for summarization');
  });
});
