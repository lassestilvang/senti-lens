import { isImmediateHazard } from './safetyInterrupt';

describe('Safety Interrupt Utility', () => {
  it('should return true for a red traffic light', () => {
    expect(isImmediateHazard(['traffic light (red)', 'car'])).toBe(true);
  });

  it('should return true for an obstacle in path', () => {
    expect(isImmediateHazard(['obstacle in path', 'tree'])).toBe(true);
  });

  it('should return false for non-hazardous objects', () => {
    expect(isImmediateHazard(['pedestrian crossing', 'bench'])).toBe(false);
  });

  it('should return false for empty list', () => {
    expect(isImmediateHazard([])).toBe(false);
  });
});
