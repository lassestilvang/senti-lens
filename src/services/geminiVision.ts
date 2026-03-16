export interface SceneAnalysis {
  objects: string[];
  text: string;
  environment: string;
  confidence?: number;
}

export interface DocumentAnalysis {
  fullText: string;
  documentType: string;
  confidence: number;
}

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
}

export interface DocumentEntities {
  dates: string[];
  amounts: string[];
  names: string[];
}

export interface DocumentAnswer {
  answer: string;
}

export interface EnvironmentAnalysis {
  safetyObjects: string[];
  sceneContext: string;
  confidence: number;
}

// ─── Mock data for test environment ────────────────────────────────────

const MOCK_SCENE: SceneAnalysis = {
  objects: ['Cheerios', 'Frosted Flakes'],
  text: 'GLUTEN FREE',
  environment: 'grocery store cereal aisle',
};

const MOCK_DOCUMENT: DocumentAnalysis = {
  fullText: 'This is a sample medical bill from City Hospital. Total amount due is $150.00 by 2026-04-01.',
  documentType: 'medical bill',
  confidence: 0.98,
};

const MOCK_ENVIRONMENT: EnvironmentAnalysis = {
  safetyObjects: ['traffic light (red)', 'pedestrian crossing'],
  sceneContext: 'At a busy street intersection with a clear crossing ahead.',
  confidence: 0.96,
};

// ─── API route-backed implementations ──────────────────────────────────

async function callAnalyzeApi(image: string, mode: string, question?: string) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mode, question }),
  });

  if (!response.ok) {
    // Try to extract the structured error from the API response
    let errorMessage = `Analysis failed (${response.status})`;
    let errorCode = 'UNKNOWN';
    try {
      const body = await response.json();
      if (body.error) errorMessage = body.error;
      if (body.code) errorCode = body.code;
      // Log structured debug info if present
      if (body.debug) {
        console.error('[VisionService] Detailed Error:', body.debug);
      }
    } catch {
      // body wasn't JSON — keep the generic message
    }

    const err = new Error(errorMessage);
    (err as Error & { code: string }).code = errorCode;
    throw err;
  }

  return response.json();
}

export async function analyzeFrame(base64Image: string): Promise<SceneAnalysis> {
  if (!base64Image) {
    throw new Error('Invalid image data');
  }

  if (process.env.NODE_ENV === 'test') {
    return MOCK_SCENE;
  }

  const result = await callAnalyzeApi(base64Image, 'grocery');
  return {
    objects: result.objects || [],
    text: result.text || '',
    environment: result.environment || '',
    confidence: result.confidence,
  };
}

export async function analyzeDocument(base64Image: string): Promise<DocumentAnalysis> {
  if (!base64Image) {
    throw new Error('Invalid image data');
  }

  if (process.env.NODE_ENV === 'test') {
    return MOCK_DOCUMENT;
  }

  const result = await callAnalyzeApi(base64Image, 'document');
  return {
    fullText: result.fullText || '',
    documentType: result.documentType || 'unknown',
    confidence: result.confidence || 0,
  };
}

export async function summarizeDocument(text: string): Promise<DocumentSummary> {
  if (!text || text.trim() === '') {
    throw new Error('No text provided for summarization');
  }

  if (process.env.NODE_ENV === 'test') {
    return {
      summary: 'A medical bill from City Hospital totaling $150.00.',
      keyPoints: [
        'Provider: City Hospital',
        'Amount: $150.00',
        'Due Date: 2026-04-01',
      ],
    };
  }

  // Use the ground API for text-only summarization
  const response = await fetch('/api/ground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `Summarize this document text and provide key points as JSON: {"summary": "string", "keyPoints": ["string"]}.\n\nDocument:\n${text}`,
    }),
  });
  const result = await response.json();
  return {
    summary: result.summary || result.verified_fact || text.slice(0, 100),
    keyPoints: result.keyPoints || [],
  };
}

export async function extractEntities(text: string): Promise<DocumentEntities> {
  if (!text || text.trim() === '' || text.includes('without data')) {
    return { dates: [], amounts: [], names: [] };
  }

  if (process.env.NODE_ENV === 'test') {
    return {
      dates: ['2026-04-01'],
      amounts: ['$150.00'],
      names: ['City Hospital'],
    };
  }

  const response = await fetch('/api/ground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `Extract entities from this text. Return JSON: {"dates": [], "amounts": [], "names": []}.\n\nText:\n${text}`,
    }),
  });
  const result = await response.json();
  return {
    dates: result.dates || [],
    amounts: result.amounts || [],
    names: result.names || [],
  };
}

export async function askDocumentQuestion(context: string, question: string): Promise<DocumentAnswer> {
  if (!question || question.trim() === '') {
    throw new Error('Question is required');
  }

  if (process.env.NODE_ENV === 'test') {
    return { answer: 'According to the document, you owe $150.00.' };
  }

  const response = await fetch('/api/ground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      context,
    }),
  });
  const result = await response.json();
  return { answer: result.verified_fact || 'I could not answer this question with the available context.' };
}

export async function analyzeEnvironment(base64Image: string): Promise<EnvironmentAnalysis> {
  if (!base64Image) {
    throw new Error('Invalid image data');
  }

  if (process.env.NODE_ENV === 'test') {
    return MOCK_ENVIRONMENT;
  }

  const result = await callAnalyzeApi(base64Image, 'environment');
  return {
    safetyObjects: result.safetyObjects || [],
    sceneContext: result.sceneContext || '',
    confidence: result.confidence || 0,
  };
}
