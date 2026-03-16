import { formatAttributedResponse } from './attributionService';

describe('Grounding Attribution Service', () => {
  it('should format a response with source attribution', () => {
    const rawResponse = 'The price of milk is $3.49.';
    const source = 'Local Retailer Search API';
    
    const attributed = formatAttributedResponse(rawResponse, source);
    
    expect(attributed).toContain(rawResponse);
    expect(attributed).toContain('According to Local Retailer Search API');
  });

  it('should handle responses without specific sources', () => {
    const rawResponse = 'I could not find the price.';
    const attributed = formatAttributedResponse(rawResponse);
    expect(attributed).toBe(rawResponse);
  });
});
