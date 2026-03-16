export const GROCERY_TOOL_SCHEMA = {
  name: 'search_grocery_price',
  description: 'Search for current grocery prices and availability.',
  input_schema: {
    type: 'object',
    properties: {
      item: { type: 'string', description: 'The name of the grocery item.' }
    },
    required: ['item']
  }
};

export const MEDICAL_TOOL_SCHEMA = {
  name: 'search_medical_database',
  description: 'Search for official medical information and drug labels.',
  input_schema: {
    type: 'object',
    properties: {
      drug: { type: 'string', description: 'The name of the medication.' }
    },
    required: ['drug']
  }
};

export interface GroceryPriceResult {
  item: string;
  price: string;
  currency: string;
  source: string;
}

export interface MedicalDatabaseResult {
  drug: string;
  indications: string;
  warnings: string;
  source: string;
}

export async function searchGroceryPrice(item: string): Promise<GroceryPriceResult> {
  if (!item) throw new Error('Item name is required');
  
  // Mock external provider
  return {
    item,
    price: '$3.49',
    currency: 'USD',
    source: 'Local Retailer Search API'
  };
}

export async function searchMedicalDatabase(drug: string): Promise<MedicalDatabaseResult> {
  if (!drug) throw new Error('Drug name is required');

  // Mock external provider
  return {
    drug,
    indications: 'Relief of mild to moderate pain.',
    warnings: 'May cause stomach irritation. Do not exceed 6 tablets a day.',
    source: 'National Medical Registry'
  };
}
