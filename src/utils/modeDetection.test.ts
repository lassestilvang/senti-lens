import { suggestModeFromScene } from './modeDetection';

describe('AI Mode Suggestion Utility', () => {
  it('should suggest "document" if a document is spotted in grocery mode', () => {
    const analysis = {
      objects: ['cereal box', 'text document'],
      environment: 'grocery store'
    };
    expect(suggestModeFromScene(analysis, 'grocery')).toBe('document');
  });

  it('should suggest "medication" if a pill bottle is spotted', () => {
    const analysis = {
      objects: ['pill bottle', 'table'],
      environment: 'home'
    };
    expect(suggestModeFromScene(analysis, 'environment')).toBe('medication');
  });

  it('should return null if the current mode is appropriate', () => {
    const analysis = {
      objects: ['apple', 'banana'],
      environment: 'grocery store'
    };
    expect(suggestModeFromScene(analysis, 'grocery')).toBeNull();
  });
});
