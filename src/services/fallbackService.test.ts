import { handleGroundingFallback } from './fallbackService';

describe('Grounding Fallback Service', () => {
  it('should return a timeout message when a timeout error occurs', () => {
    const error = new Error('Grounding tool call timed out');
    const result = handleGroundingFallback(error);
    
    expect(result).toContain('verification could not be completed in time');
    expect(result).toContain('Please try again');
  });

  it('should return a missing results message when no data is found', () => {
    const result = handleGroundingFallback(null);
    expect(result).toContain('No external verification records found');
  });

  it('should include a safety warning for medical scenarios in fallback', () => {
    const result = handleGroundingFallback(null, 'medical');
    expect(result).toContain('please consult a professional');
  });
});
