/**
 * @jest-environment node
 */
import { orchestrateToolCall } from './groundingOrchestrator';

describe('Grounding Orchestrator', () => {
  it('should trigger search_grocery_price when scenario is grocery', async () => {
    const context = { scenario: 'grocery', query: 'how much is milk?' };
    const result = await orchestrateToolCall(context);
    
    expect(result).toHaveProperty('tool');
    expect(result.tool).toBe('search_grocery_price');
    expect(result.args).toHaveProperty('item', 'milk');
  });

  it('should trigger search_medical_database when scenario is medical', async () => {
    const context = { scenario: 'medical', query: 'tell me about aspirin' };
    const result = await orchestrateToolCall(context);
    
    expect(result.tool).toBe('search_medical_database');
    expect(result.args).toHaveProperty('drug', 'aspirin');
  });

  it('should throw error for unknown scenario', async () => {
    const context = { scenario: 'unknown', query: 'test' };
    await expect(orchestrateToolCall(context)).rejects.toThrow('Unknown scenario');
  });
});
