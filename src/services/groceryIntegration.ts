import { searchGroceryPrice } from './searchTools';

export interface GroceryVerificationResult {
  item: string;
  price: string;
  source: string;
}

export async function verifyGroceryWithGeminiFunctionCalling(query: string): Promise<GroceryVerificationResult | null> {
  // Use the ground API to extract the item and decide to search
  const response = await fetch('/api/ground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `The user asks about: "${query}". Extract the grocery item name and return it as JSON: {"item": "string"}`,
    }),
  });

  if (!response.ok) return null;

  const groundResult = await response.json();
  const item = groundResult.item || groundResult.verified_fact?.match(/item:? "([^"]+)"/i)?.[1];

  if (item) {
    // Call the mock external API via searchTools or similar
    const result = await searchGroceryPrice(item);
    return {
      item: result.item,
      price: result.price,
      source: result.source
    };
  }

  return null;
}
