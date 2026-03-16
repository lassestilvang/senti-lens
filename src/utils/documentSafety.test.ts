import { formatDocumentResponse } from './documentSafety';

describe('documentSafety - formatDocumentResponse', () => {
  it('should append a disclaimer for medical documents', () => {
    const response = 'Your total due is $150.00.';
    const formatted = formatDocumentResponse(response, 'medical bill');
    
    expect(formatted).toContain(response);
    expect(formatted).toContain('Please consult a professional');
  });

  it('should append a disclaimer for government letters', () => {
    const response = 'You have 14 days to respond.';
    const formatted = formatDocumentResponse(response, 'government letter');
    
    expect(formatted).toContain(response);
    expect(formatted).toContain('Please consult a professional');
  });

  it('should not append a disclaimer for general product docs', () => {
    const response = 'The battery life is 10 hours.';
    const formatted = formatDocumentResponse(response, 'product manual');
    
    expect(formatted).toBe(response);
  });

  it('should return uncertainty message if confidence is low', () => {
    const formatted = formatDocumentResponse('Some text', 'medical bill', 0.5);
    expect(formatted).toBe('I cannot read this clearly. Please move closer or hold steady.');
  });
});
