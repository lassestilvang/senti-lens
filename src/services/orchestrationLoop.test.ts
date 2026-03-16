import { analyzeFrame } from './geminiVision';
import { evaluateProactiveSuggestion } from './orchestrator';

// Mock dependencies
jest.mock('./geminiVision', () => ({
  analyzeFrame: jest.fn(),
}));

jest.mock('./orchestrator', () => ({
  evaluateProactiveSuggestion: jest.fn(),
}));

describe('Orchestration Loop Integration', () => {
  it('should process a captured frame through vision and orchestration services', async () => {
    const mockFrame = 'data:image/jpeg;base64,mock-frame';
    const mockAnalysis = {
      objects: ['Oatmeal'],
      text: 'Healthy',
      environment: 'grocery store'
    };
    const mockMemory = {
      environment: 'grocery store',
      objects_seen: [],
      user_goal: 'find healthy cereal'
    };

    (analyzeFrame as jest.Mock).mockResolvedValue(mockAnalysis);
    (evaluateProactiveSuggestion as jest.Mock).mockResolvedValue({ shouldSuggest: true, suggestionPrompt: 'Prompt' });

    // Simulate the loop logic
    const analysis = await analyzeFrame(mockFrame);
    const result = await evaluateProactiveSuggestion(mockMemory, analysis);

    expect(analyzeFrame).toHaveBeenCalledWith(mockFrame);
    expect(evaluateProactiveSuggestion).toHaveBeenCalledWith(mockMemory, mockAnalysis);
    expect(result.shouldSuggest).toBe(true);
  });
});
