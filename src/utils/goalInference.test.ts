import { inferGoalFromQuestion } from './goalInference';

describe('inferGoalFromQuestion', () => {
  it('extracts a target from where-is queries', () => {
    expect(inferGoalFromQuestion('Where is the baseball in frame?')).toBe('baseball');
  });

  it('extracts a target from find queries', () => {
    expect(inferGoalFromQuestion('Find my red water bottle')).toBe('red water bottle');
  });

  it('returns null for broad questions without a target', () => {
    expect(inferGoalFromQuestion('What do you see right now?')).toBeNull();
  });
});
