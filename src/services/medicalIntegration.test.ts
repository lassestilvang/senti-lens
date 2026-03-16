/**
 * @jest-environment node
 */
import { triggerGroundingTool } from './groundingOrchestrator';
import { formatAttributedResponse } from './attributionService';

describe('End-to-End Medical Grounding Integration', () => {
  it('should complete a full medical grounding flow', async () => {
    const context = { scenario: 'medical', query: 'aspirin dosage' };
    
    // 1. Trigger grounding
    const groundedResult = await triggerGroundingTool(context);
    expect(groundedResult.verified_fact).toContain('Verified: aspirin is used for Relief of mild to moderate pain');
    
    // 2. Format with attribution
    const finalResponse = formatAttributedResponse(
      groundedResult.verified_fact, 
      'National Medical Registry'
    );
    
    expect(finalResponse).toContain('According to National Medical Registry');
    expect(finalResponse).toContain('Warnings');
  });
});
