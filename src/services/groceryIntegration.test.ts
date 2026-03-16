/**
 * @jest-environment node
 */
import { triggerGroundingTool } from './groundingOrchestrator';
import { formatAttributedResponse } from './attributionService';
import { verifyGroceryWithGeminiFunctionCalling } from './groceryIntegration';
import { searchGroceryPrice } from './searchTools';

// Mock global fetch
global.fetch = jest.fn();

jest.mock('./searchTools', () => ({
  searchGroceryPrice: jest.fn(),
  GROCERY_TOOL_SCHEMA: { name: 'search_grocery_price' },
  MEDICAL_TOOL_SCHEMA: { name: 'search_medical_database' },
}));

describe('Grocery Integration with Gemini Function Calling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch /api/ground and then searchGroceryPrice', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ item: 'oatmeal' })
    });

    (searchGroceryPrice as jest.Mock).mockResolvedValue({
      item: 'oatmeal',
      price: '$4.99',
      source: 'Mock Grocery API'
    });

    const result = await verifyGroceryWithGeminiFunctionCalling('price of oatmeal');
    expect(global.fetch).toHaveBeenCalled();
    expect(searchGroceryPrice).toHaveBeenCalledWith('oatmeal');
    expect(result).toEqual({
      item: 'oatmeal',
      price: '$4.99',
      source: 'Mock Grocery API'
    });
  });
});

describe('End-to-End Grocery Grounding Integration via triggerGroundingTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete a full grocery grounding flow', async () => {
    const context = { scenario: 'grocery', query: 'price of milk' };
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ item: 'milk' })
    });

    (searchGroceryPrice as jest.Mock).mockResolvedValue({
      item: 'milk',
      price: '$3.49',
      source: 'External Product API Mock'
    });

    // 1. Trigger grounding
    const groundedResult = await triggerGroundingTool(context);
    expect(groundedResult.verified_fact).toContain('Verified: The price of milk is $3.49');
    expect(groundedResult.verified_fact).toContain('External Product API Mock');
    
    // 2. Format with attribution
    const finalResponse = formatAttributedResponse(
      groundedResult.verified_fact, 
      'External Product API Mock'
    );
    
    expect(finalResponse).toContain('According to External Product API Mock');
    expect(finalResponse).toContain('$3.49');
  });
});
