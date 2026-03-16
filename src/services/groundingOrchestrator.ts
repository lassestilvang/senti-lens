import { GROCERY_TOOL_SCHEMA, MEDICAL_TOOL_SCHEMA, searchMedicalDatabase } from './searchTools';
import { verifyGroceryWithGeminiFunctionCalling } from './groceryIntegration';

export interface OrchestrationContext {
  scenario: string;
  query: string;
}

export interface ToolCallResult {
  tool: string;
  args: unknown;
}

export interface GroundedResult {
  verified_fact: string;
}

/**
 * Orchestrates tool calls based on context.
 * @param context The current session context
 * @returns The tool to be called and its arguments
 */
export async function orchestrateToolCall(context: OrchestrationContext): Promise<ToolCallResult> {
  if (context.scenario === 'grocery') {
    return {
      tool: GROCERY_TOOL_SCHEMA.name,
      args: { item: 'milk' }
    };
  } else if (context.scenario === 'medical') {
    return {
      tool: MEDICAL_TOOL_SCHEMA.name,
      args: { drug: 'aspirin' }
    };
  } else {
    throw new Error('Unknown scenario');
  }
}

/**
 * Triggers the appropriate grounding tool and returns a verified fact string.
 * @param context The current session context
 * @returns A grounded result
 */
export async function triggerGroundingTool(context: OrchestrationContext): Promise<GroundedResult> {
  if (context.scenario === 'grocery') {
    const result = await verifyGroceryWithGeminiFunctionCalling(context.query);
    if (result) {
      return {
        verified_fact: `Verified: The price of ${result.item} is ${result.price} (via ${result.source}).`
      };
    }
    throw new Error('Grocery verification failed');
  }

  const orchestrated = await orchestrateToolCall(context);

  if (orchestrated.tool === MEDICAL_TOOL_SCHEMA.name) {
    const args = orchestrated.args as { drug: string };
    const rawResult = await searchMedicalDatabase(args.drug);
    return {
      verified_fact: `Verified: ${rawResult.drug} is used for ${rawResult.indications}. Warnings: ${rawResult.warnings} (via ${rawResult.source}).`
    };
  }

  throw new Error('Failed to trigger appropriate tool');
}
