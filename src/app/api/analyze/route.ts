import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

interface AnalyzeRequest {
  image: string; // base64-encoded JPEG
  mode: 'grocery' | 'document' | 'medication' | 'environment';
  question?: string;
}

function getPromptForMode(mode: string, question?: string): string {
  const baseRules = `
CRITICAL RULES:
1. If text is blurry or partially obscured, you MUST state "I cannot read this clearly". Do NOT guess or interpolate missing words.
2. Only list objects you are highly confident exist in the frame.
3. Include a confidence score (0-1) for each extracted field and omit low-confidence entities.
4. If confidence is low for safety-critical content, say so instead of guessing.
`;

  switch (mode) {
    case 'grocery':
      return `Analyze the image of a grocery store or product shelf.

Describe:
- objects present (product names, brands)
- visible text (labels, prices)
- environment type

Return your response as valid JSON with this exact structure:
{"objects": ["string"], "text": "string", "environment": "string", "confidence": 0.0}

${baseRules}
${question ? `\nThe user specifically asks: "${question}"` : ''}`;

    case 'document':
      return `Perform high-precision OCR on this document image.

Identify the document type and extract all visible text.

Return your response as valid JSON with this exact structure:
{"fullText": "string", "documentType": "string", "confidence": 0.0}

${baseRules}`;

    case 'medication':
      return `Analyze the image of a medication label.

Describe:
- medication name
- strength (e.g., 400mg)
- dosage instructions

Return your response as valid JSON with this exact structure:
{"name": "string", "strength": "string", "dosage": "string", "confidence": 0.0}

${baseRules}
ADDITIONAL SAFETY RULE: If ANY dosage information is unclear, you MUST state "I cannot read this clearly. Please do not guess." Do NOT interpolate missing dosage data.`;

    case 'environment':
      return `Analyze the environment in this image for safety-critical objects and general context.

Identify:
- safety-critical objects (traffic lights, crossings, obstacles, vehicles, warning signs)
- general scene context (location type, conditions)

Return your response as valid JSON with this exact structure:
{"safetyObjects": ["string"], "sceneContext": "string", "confidence": 0.0}

${baseRules}`;

    default:
      return `Analyze this image. Return JSON with "objects", "text", "environment", and "confidence" fields.\n${baseRules}`;
  }
}

export async function POST(request: NextRequest) {
  if (!genAI) {
    console.error('[/api/analyze] Missing GOOGLE_API_KEY');
    return NextResponse.json(
      {
        error: 'Server configuration error: Missing API Key.',
        code: 'CONFIG_ERROR',
      },
      { status: 500 }
    );
  }

  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.image) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    if (!body.mode) {
      return NextResponse.json({ error: 'Mode is required' }, { status: 400 });
    }

    const base64Data = body.image.includes(',') ? body.image.split(',')[1] : body.image;
    
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    
    const prompt = getPromptForMode(body.mode, body.question);

    // Initial retry logic for 429s (up to 3 retries)
    let result;
    let attempts = 0;
    const maxRetries = 2;

    while (attempts <= maxRetries) {
      try {
        result = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          },
          { text: prompt }
        ]);
        break; // Success!
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota');
        
        if (isRateLimit && attempts <= maxRetries) {
          // Extract retry wait time if present (Gemini returns something like "retry in 34.89009394s")
          const waitMatch = errorMessage.match(/retry in ([\d.]+)s/);
          const waitSeconds = waitMatch ? parseFloat(waitMatch[1]) : Math.pow(2, attempts);
          
          console.warn(`[/api/analyze] Rate limited. Retrying after ${waitSeconds}s (Attempt ${attempts}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          continue;
        }
        throw error; // Re-throw if not rate limit or max retries reached
      }
    }

    if (!result) {
      throw new Error('Analysis failed after retries');
    }

    const response = await result.response;
    const responseText = response.text();

    let parsed;
    try {
      // Clean potential Markdown formatting if present
      const jsonStr = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: responseText };
      } catch {
        parsed = { raw: responseText };
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[/api/analyze] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        // Extract retry seconds for the client
        const waitMatch = errorMessage.match(/retry in ([\d.]+)s/);
        const retryAfter = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 30;

        return NextResponse.json(
          {
            error: `Too many requests — please wait ${retryAfter} seconds and try again.`,
            code: 'THROTTLED',
            retryAfter: retryAfter,
          },
          { status: 429 }
        );
    }

    return NextResponse.json(
      {
        error: `Analysis failed: ${errorMessage}`,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
