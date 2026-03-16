import { findGoalObjectMatch } from './goalMatching';

describe('findGoalObjectMatch', () => {
  it('matches core noun in a natural-language goal', () => {
    const match = findGoalObjectMatch('help me find the baseball', ['water bottle', 'baseball']);
    expect(match).toBe('baseball');
  });

  it('matches longer labels that contain the goal keyword', () => {
    const match = findGoalObjectMatch('find baseball', ['baseball glove', 'shoe']);
    expect(match).toBe('baseball glove');
  });

  it('returns null when nothing is relevant', () => {
    const match = findGoalObjectMatch('find baseball', ['chair', 'table']);
    expect(match).toBeNull();
  });
});
