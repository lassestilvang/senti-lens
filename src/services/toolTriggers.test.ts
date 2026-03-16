/**
 * @jest-environment node
 */
import { triggerGroundingTool } from './groundingOrchestrator';

// Mock global fetch
global.fetch = jest.fn();

describe('Grounding Tool Triggers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute grocery search and return grounded info', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ item: 'milk' })
    });

    const context = { scenario: 'grocery', query: 'price of milk' };
    const result = await triggerGroundingTool(context);
    
    expect(result).toHaveProperty('verified_fact');
    expect(result.verified_fact).toContain('milk');
    expect(result.verified_fact).toContain('$3.49');
  });

  it('should execute medical search and return grounded info', async () => {
    const context = { scenario: 'medical', query: 'aspirin side effects' };
    const result = await triggerGroundingTool(context);
    
    expect(result).toHaveProperty('verified_fact');
    expect(result.verified_fact).toContain('aspirin');
    expect(result.verified_fact).toContain('Warnings');
  });

  it('should throw error for unknown scenario', async () => {
    const context = { scenario: 'unknown', query: 'test' };
    await expect(triggerGroundingTool(context)).rejects.toThrow('Unknown scenario');
  });
});
