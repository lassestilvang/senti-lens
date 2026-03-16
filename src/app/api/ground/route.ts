import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3.0-flash-preview';

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

interface GroundRequest {
  query: string;
  context?: string; // visual context from scene analysis
  scenario?: 'grocery' | 'medical' | 'general';
}

/**
 * POST /api/ground
 * Uses Gemini to reason about and verify visual observations.
 */
export async function POST(request: NextRequest) {
  if (!genAI) {
    return NextResponse.json({
      verified_fact: null,
      source: null,
      fallback: true,
      message: 'Server configuration error: Missing API Key.',
    }, { status: 500 });
  }

  try {
    const body: GroundRequest = await request.json();

    if (!body.query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const prompt = buildGroundingPrompt(body);
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Try to parse structured response
    let parsed;
    try {
      const jsonStr = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { verified_fact: responseText, source: 'Gemini reasoning' };
      } catch {
        parsed = { verified_fact: responseText, source: 'Gemini reasoning' };
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[/api/ground] Error:', error);

    // Graceful fallback as per the failure-mode matrix
    return NextResponse.json({
      verified_fact: null,
      source: null,
      fallback: true,
      message: 'External verification could not be completed. Answer is based only on visible text.',
      debug: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }
}

function buildGroundingPrompt(req: GroundRequest): string {
  let prompt = `You are a fact-verification assistant. Your job is to evaluate the following claim or question using your knowledge and provide a grounded, verified response.

RULES:
1. Only state facts you are confident about.
2. If you are uncertain, say "I cannot verify this with high confidence."
3. Always cite the basis for your answer (e.g., "Based on general nutritional knowledge..." or "Based on the visible label text...").
4. For medical information, ALWAYS include: "Please consult a healthcare professional for definitive advice."

Return your response as valid JSON: {"verified_fact": "string", "confidence": 0.0, "source": "string"}

`;

  if (req.context) {
    prompt += `Visual context from the scene:\n${req.context}\n\n`;
  }

  prompt += `Question/Claim to verify:\n${req.query}`;

  return prompt;
}
