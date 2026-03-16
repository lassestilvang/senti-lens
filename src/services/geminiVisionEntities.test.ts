/**
 * @jest-environment node
 */
import { extractEntities } from './geminiVision';

describe('geminiVision - extractEntities', () => {
  it('should extract specific entities from document text', async () => {
    const text = 'This is a medical bill for $150.00 from City Hospital. Due date is 2026-04-01.';
    const entities = await extractEntities(text);

    expect(entities).toHaveProperty('dates');
    expect(entities).toHaveProperty('amounts');
    expect(entities).toHaveProperty('names');
    expect(Array.isArray(entities.dates)).toBe(true);
    expect(entities.dates).toContain('2026-04-01');
    expect(entities.amounts).toContain('$150.00');
  });

  it('should return empty arrays if no entities found', async () => {
    const entities = await extractEntities('Just some plain text without data.');
    expect(entities.dates).toEqual([]);
    expect(entities.amounts).toEqual([]);
  });
});
