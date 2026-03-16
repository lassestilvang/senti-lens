import { getSpatialReasoningPrompt } from './spatialReasoning';

describe('Spatial Reasoning Prompt Utilities', () => {
  it('should return a prompt including safety objects and context', () => {
    const safetyObjects = ['traffic light', 'crossing'];
    const context = 'At an intersection';
    
    const prompt = getSpatialReasoningPrompt(safetyObjects, context);
    
    expect(prompt).toContain('traffic light');
    expect(prompt).toContain('crossing');
    expect(prompt).toContain('At an intersection');
    expect(prompt).toContain('spatial reasoning');
  });
});
