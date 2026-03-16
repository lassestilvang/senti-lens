/**
 * @jest-environment node
 */
import { askDocumentQuestion } from './geminiVision';

describe('geminiVision - askDocumentQuestion', () => {
  it('should answer a question based on document context', async () => {
    const context = 'City Hospital medical bill for $150.00 due on 2026-04-01.';
    const question = 'How much do I owe?';
    const answer = await askDocumentQuestion(context, question);

    expect(answer).toHaveProperty('answer');
    expect(answer.answer).toContain('$150.00');
  });

  it('should throw error for empty question', async () => {
    await expect(askDocumentQuestion('context', '')).rejects.toThrow('Question is required');
  });
});
