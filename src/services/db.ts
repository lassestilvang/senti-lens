import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (typeof window === 'undefined') return null; // Firestore client SDK usually used in browser
  
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return null; // Firebase not configured
  }

  if (!app && getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else if (!db) {
    db = getFirestore();
  }
  return db;
}

const COLLECTION_NAME = process.env.SESSIONS_COLLECTION || 'SentiLensSessions';

// Mock storage for testing or when Firebase is not configured
const mockStorage: Record<string, Record<string, unknown>> = {};

/**
 * Save session memory to Firestore.
 */
export async function saveSessionMemory(sessionId: string, data: Record<string, unknown>) {
  const firestore = getDb();
  
  if (!firestore) {
    console.warn('[DB] Firebase not configured, using mock storage');
    mockStorage[sessionId] = { 
        ...data, 
        updatedAt: new Date().toISOString() 
    };
    return;
  }

  try {
    const sessionRef = doc(firestore, COLLECTION_NAME, sessionId);
    await setDoc(sessionRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    // Fallback to mock storage
    mockStorage[sessionId] = data;
  }
}

/**
 * Read session memory from Firestore.
 */
export async function getSessionMemory(sessionId: string) {
  const firestore = getDb();

  if (!firestore) {
    console.warn('[DB] Firebase not configured, using mock storage');
    return mockStorage[sessionId] || null;
  }

  try {
    const sessionRef = doc(firestore, COLLECTION_NAME, sessionId);
    const docSnap = await getDoc(sessionRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return mockStorage[sessionId] || null;
  } catch (error) {
    console.error('Error reading from Firestore:', error);
    return mockStorage[sessionId] || null;
  }
}
