/**
 * @jest-environment node
 */
import { searchGroceryPrice, searchMedicalDatabase } from './searchTools';

describe('Grounding Search Tools', () => {
  it('should return price data for a grocery item', async () => {
    const result = await searchGroceryPrice('milk');
    expect(result).toHaveProperty('item', 'milk');
    expect(result).toHaveProperty('price');
    expect(result).toHaveProperty('source');
  });

  it('should return medical info for a drug name', async () => {
    const result = await searchMedicalDatabase('ibuprofen');
    expect(result).toHaveProperty('drug', 'ibuprofen');
    expect(result).toHaveProperty('indications');
    expect(result).toHaveProperty('warnings');
  });

  it('should throw error for empty query in grocery search', async () => {
    await expect(searchGroceryPrice('')).rejects.toThrow('Item name is required');
  });

  it('should throw error for empty query in medical search', async () => {
    await expect(searchMedicalDatabase('')).rejects.toThrow('Drug name is required');
  });
});
