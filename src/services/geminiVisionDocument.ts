import { analyzeDocument, summarizeDocument, askDocumentQuestion } from './geminiVision';

export interface DocumentWorkflowResult {
  fullText: string;
  documentType: string;
  confidence: number;
  summary: string;
  keyPoints: string[];
  nextSteps: string;
}

export async function processDocumentWorkflow(base64Image: string): Promise<DocumentWorkflowResult> {
  const analysis = await analyzeDocument(base64Image);
  
  if (analysis.confidence < 0.95) {
    throw new Error('I cannot read this clearly. Please move closer or hold steady.');
  }

  const summaryResult = await summarizeDocument(analysis.fullText);
  
  // Ask for next steps based on the document text
  const nextStepsResult = await askDocumentQuestion(
    analysis.fullText, 
    'What should I do next based on this document?'
  );

  return {
    fullText: analysis.fullText,
    documentType: analysis.documentType,
    confidence: analysis.confidence,
    summary: summaryResult.summary,
    keyPoints: summaryResult.keyPoints,
    nextSteps: nextStepsResult.answer
  };
}
