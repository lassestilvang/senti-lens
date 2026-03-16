import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    // If applicationDefault() fails (e.g. locally), we might just use mock logic or specific env vars
    console.warn('[MemoryAPI] Firebase admin initialization failed (ignore if using mock):', error);
  }
}

const COLLECTION_NAME = process.env.SESSIONS_COLLECTION || 'SentiLensSessions';

interface MemoryData {
  environment?: string;
  objects_seen?: string[];
  user_goal?: string;
  recent_observations?: string[];
}

/**
 * GET /api/memory?sessionId=xxx
 * Retrieves session memory from Firestore.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  try {
    if (!admin.apps.length) {
        return NextResponse.json({ data: null, warning: 'Firestore not initialized' });
    }

    const doc = await admin.firestore().collection(COLLECTION_NAME).doc(sessionId).get();

    if (!doc.exists) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: doc.data() || null });
  } catch (error) {
    console.error('[/api/memory] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session memory' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory
 * Saves session memory to Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, data } = body as { sessionId: string; data: MemoryData };

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!admin.apps.length) {
        return NextResponse.json({ success: false, warning: 'Firestore not initialized' });
    }

    await admin.firestore().collection(COLLECTION_NAME).doc(sessionId).set({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/memory] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save session memory' },
      { status: 500 }
    );
  }
}
