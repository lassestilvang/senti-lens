/**
 * @jest-environment node
 */
import { processDocumentWorkflow } from './geminiVisionDocument';
import { analyzeDocument, summarizeDocument, askDocumentQuestion } from './geminiVision';

jest.mock('./geminiVision', () => ({
  analyzeDocument: jest.fn(),
  summarizeDocument: jest.fn(),
  askDocumentQuestion: jest.fn(),
}));

describe('Document Interpreter Workflow', () => {
  it('should extract document, summarize, and identify next steps', async () => {
    (analyzeDocument as jest.Mock).mockResolvedValue({
      fullText: 'Important tax letter. Overdue by 14 days.',
      documentType: 'government letter',
      confidence: 0.98
    });

    (summarizeDocument as jest.Mock).mockResolvedValue({
      summary: 'Your tax payment is overdue and you have fourteen days to respond.',
      keyPoints: ['Overdue tax']
    });

    (askDocumentQuestion as jest.Mock).mockResolvedValue({
      answer: 'You should pay the tax immediately.'
    });

    const result = await processDocumentWorkflow('mock-image-data');
    
    expect(analyzeDocument).toHaveBeenCalledWith('mock-image-data');
    expect(summarizeDocument).toHaveBeenCalledWith('Important tax letter. Overdue by 14 days.');
    expect(result.summary).toBe('Your tax payment is overdue and you have fourteen days to respond.');
    expect(result.nextSteps).toBeDefined();
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it('should refuse to process if confidence is low', async () => {
    (analyzeDocument as jest.Mock).mockResolvedValue({
      fullText: 'blurry text',
      documentType: 'unknown',
      confidence: 0.8
    });

    await expect(processDocumentWorkflow('mock-image-data')).rejects.toThrow('I cannot read this clearly');
  });
});
