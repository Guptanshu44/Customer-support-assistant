/**
 * CareBot - Firebase Cloud Integration Service
 * Provides Authentication (Google / Email) and Cloud Firestore (real-time Tickets & Chat sessions)
 * with robust offline fallback to localStorage if unconfigured.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const FIREBASE_STORAGE_KEY = 'carebot_firebase_config';

/**
 * Retrieves the currently saved Firebase config from localStorage or Vite environment variables.
 */
export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Firebase] Could not read stored config from localStorage', e);
  }

  // Fallback to Vite environment variables if defined
  if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
  }

  return null;
}

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let googleProvider = null;

/**
 * Initializes or re-initializes Firebase instance.
 */
export function initFirebase(customConfig = null) {
  const config = customConfig || getStoredFirebaseConfig();

  if (!config || !config.apiKey || !config.projectId) {
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
    googleProvider = null;
    return false;
  }

  try {
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(config);
    }
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    console.log('[Firebase] Initialized successfully for project:', config.projectId);
    return true;
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
    return false;
  }
}

// Initial self-boot
initFirebase();

export function isFirebaseConfigured() {
  return Boolean(firebaseApp && firestoreDb);
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
    return initFirebase(config);
  } catch (e) {
    console.error('[Firebase] Failed to save config to localStorage', e);
    return false;
  }
}

export function clearFirebaseConfig() {
  try {
    localStorage.removeItem(FIREBASE_STORAGE_KEY);
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
    return true;
  } catch (e) {
    console.error('[Firebase] Failed to clear config', e);
    return false;
  }
}

/* =========================================================================
   AUTHENTICATION HELPERS
   ========================================================================= */

export function onAuthChange(callback) {
  if (!firebaseAuth) {
    // Check if there is a mock agent profile stored locally
    const localUser = localStorage.getItem('carebot_local_user');
    callback(localUser ? JSON.parse(localUser) : null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      const profile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Support Agent',
        photoURL: user.photoURL || null,
        isAnonymous: user.isAnonymous,
        role: user.email?.includes('lead') || user.email?.includes('admin') ? 'Supervisor' : 'Tier-1 Specialist'
      };
      callback(profile);
    } else {
      callback(null);
    }
  });
}

export async function loginWithGoogle() {
  if (!firebaseAuth || !googleProvider) {
    throw new Error('Firebase Auth is not configured. Please enter your Firebase project keys.');
  }
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
}

export async function loginWithEmail(email, password) {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured. Please enter your Firebase project keys.');
  }
  const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return result.user;
}

export async function signupWithEmail(email, password, displayName) {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured. Please enter your Firebase project keys.');
  }
  const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

export async function logoutUser() {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
  localStorage.removeItem('carebot_local_user');
}

/**
 * Sets a local demo agent session if Firebase is not connected.
 */
export function setLocalDemoUser(name, role = 'Tier-1 Specialist') {
  const mock = {
    uid: 'local-agent-' + Date.now(),
    email: 'agent.demo@omnidesk.ai',
    displayName: name || 'Priya Sharma',
    photoURL: null,
    isLocal: true,
    role: role
  };
  localStorage.setItem('carebot_local_user', JSON.stringify(mock));
  return mock;
}

/* =========================================================================
   FIRESTORE: TICKETS REAL-TIME SYNC
   ========================================================================= */

const TICKETS_COLLECTION = 'carebot_tickets';

export function listenToTickets(onUpdate, onError) {
  if (!firestoreDb) {
    return null;
  }

  try {
    const colRef = collection(firestoreDb, TICKETS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tickets.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString())
        });
      });
      onUpdate(tickets);
    }, (err) => {
      console.warn('[Firestore] Tickets sync error:', err);
      if (onError) onError(err);
    });

    return unsubscribe;
  } catch (err) {
    console.error('[Firestore] listenToTickets failed:', err);
    if (onError) onError(err);
    return null;
  }
}

export async function saveTicketToFirestore(ticket) {
  if (!firestoreDb) return false;
  try {
    const ticketId = ticket.id || `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = doc(firestoreDb, TICKETS_COLLECTION, ticketId);
    
    const payload = {
      ...ticket,
      id: ticketId,
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp()
    };
    
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to save ticket:', err);
    return false;
  }
}

export async function deleteTicketFromFirestore(ticketId) {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, TICKETS_COLLECTION, ticketId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to delete ticket:', err);
    return false;
  }
}

/* =========================================================================
   FIRESTORE: CONVERSATIONS & SESSIONS REAL-TIME SYNC
   ========================================================================= */

const SESSIONS_COLLECTION = 'carebot_sessions';

export function listenToSessions(onUpdate, onError) {
  if (!firestoreDb) return null;

  try {
    const colRef = collection(firestoreDb, SESSIONS_COLLECTION);
    const q = query(colRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const sessions = [];
      snapshot.forEach((docSnap) => {
        sessions.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(sessions);
    }, (err) => {
      console.warn('[Firestore] Sessions sync error:', err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.error('[Firestore] listenToSessions failed:', err);
    return null;
  }
}

export async function saveSessionToFirestore(session) {
  if (!firestoreDb || !session || !session.id) return false;
  try {
    const docRef = doc(firestoreDb, SESSIONS_COLLECTION, session.id);
    await setDoc(docRef, {
      ...session,
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to save session:', err);
    return false;
  }
}
