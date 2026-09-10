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
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const FIREBASE_STORAGE_KEY = 'carebot_firebase_config';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDONWCXEgyw5JbX8PozxUEMSwpPoHX2bRU",
  authDomain: "omnidesk-e5899.firebaseapp.com",
  projectId: "omnidesk-e5899",
  storageBucket: "omnidesk-e5899.firebasestorage.app",
  messagingSenderId: "379750794887",
  appId: "1:379750794887:web:8cd2dd4480b9155c43da22",
  measurementId: "G-D05EVV9KPD"
};

const ADMIN_EMAILS = [
  'gupta.anshu68637ag@gmail.com',
  'superadmin@gmail.com',
];

export function resolveUserRole(email) {
  if (!email) return 'Tier-1 Specialist';
  const clean = String(email).toLowerCase().trim();
  if (ADMIN_EMAILS.includes(clean) || clean.includes('admin') || clean.includes('supervisor') || clean.includes('lead')) {
    return 'Administrator';
  }
  return 'Tier-1 Specialist';
}

/**
 * Retrieves the currently saved Firebase config from localStorage, Vite environment variables,
 * or default project configuration.
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
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId
    };
  }

  // Default project config ensures all visitors & devices connect to Firebase
  return DEFAULT_FIREBASE_CONFIG;
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
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
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

export function normalizeRole(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const isAdm = raw.some(r => {
      const s = String(r).toLowerCase().trim();
      return s === 'admin' || s === 'administrator' || s === 'supervisor' || s === 'lead';
    });
    if (isAdm) return 'Administrator';
    return String(raw[0] || 'Tier-1 Specialist');
  }
  if (typeof raw === 'string') {
    const s = raw.toLowerCase().trim();
    if (s === 'admin' || s === 'administrator' || s === 'supervisor' || s === 'lead') {
      return 'Administrator';
    }
    return raw.trim();
  }
  return null;
}

export async function fetchFirestoreUserRole(user) {
  if (!firestoreDb || !user) return null;
  try {
    // 1. Primary lookup by user.uid
    if (user.uid) {
      const snap = await getDoc(doc(firestoreDb, USERS_COLLECTION, user.uid));
      if (snap.exists()) {
        const d = snap.data();
        const r = normalizeRole(d.roles) || normalizeRole(d.role);
        if (r) return { role: r, displayName: d.displayName };
      }
    }
    // 2. Lookup by email-based key (e.g. google-gupta_anshu68637ag_gmail_com)
    if (user.email) {
      const emailKey = 'google-' + user.email.replace(/[^a-zA-Z0-9]/g, '_');
      const snap2 = await getDoc(doc(firestoreDb, USERS_COLLECTION, emailKey));
      if (snap2.exists()) {
        const d = snap2.data();
        const r = normalizeRole(d.roles) || normalizeRole(d.role);
        if (r) return { role: r, displayName: d.displayName };
      }
      const agentKey = 'agent-' + user.email.replace(/[^a-zA-Z0-9]/g, '_');
      const snap3 = await getDoc(doc(firestoreDb, USERS_COLLECTION, agentKey));
      if (snap3.exists()) {
        const d = snap3.data();
        const r = normalizeRole(d.roles) || normalizeRole(d.role);
        if (r) return { role: r, displayName: d.displayName };
      }
    }
  } catch (e) {
    console.warn('[Firestore] Error finding user role in Firestore:', e);
  }
  return null;
}

let cachedAuthUser = null;

export function getCurrentAuthUser() {
  if (cachedAuthUser) return cachedAuthUser;
  try {
    const localUser = localStorage.getItem('carebot_local_user');
    return localUser ? JSON.parse(localUser) : null;
  } catch (e) {
    return null;
  }
}

export function onAuthChange(callback) {
  const getFallbackUser = () => {
    try {
      const localUser = localStorage.getItem('carebot_local_user');
      return localUser ? JSON.parse(localUser) : null;
    } catch (e) {
      return null;
    }
  };

  if (!firebaseAuth) {
    const fallback = getFallbackUser();
    cachedAuthUser = fallback;
    callback(fallback);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
      let activeRole = resolveUserRole(user.email);
      let firestoreDisplayName = user.displayName;

      // Check Firestore doc to see if 'roles' or 'role' was configured in Firebase Console
      const firestoreData = await fetchFirestoreUserRole(user);
      if (firestoreData) {
        if (firestoreData.role) activeRole = firestoreData.role;
        if (firestoreData.displayName) firestoreDisplayName = firestoreData.displayName;
      }

      const profile = {
        uid: user.uid,
        email: user.email,
        displayName: firestoreDisplayName || user.displayName || user.email?.split('@')[0] || 'Support Agent',
        photoURL: user.photoURL || null,
        isAnonymous: user.isAnonymous,
        role: activeRole,
        roles: activeRole
      };
      cachedAuthUser = profile;
      callback(profile);
    } else {
      const fallback = getFallbackUser();
      cachedAuthUser = fallback;
      callback(fallback);
    }
  });
}

/* =========================================================================
   FIRESTORE: USERS COLLECTION
   ========================================================================= */

const USERS_COLLECTION = 'users';

export async function saveUserToFirestore(user, additionalData = {}) {
  if (!firestoreDb || !user) return false;
  try {
    const userRef = doc(firestoreDb, USERS_COLLECTION, user.uid);
    let existingRole = null;
    const firestoreData = await fetchFirestoreUserRole(user);
    if (firestoreData?.role) {
      existingRole = firestoreData.role;
    }

    const assignedRole = (additionalData.roles ? normalizeRole(additionalData.roles) : null) || 
                         (additionalData.role ? normalizeRole(additionalData.role) : null) || 
                         existingRole || 
                         resolveUserRole(user.email);

    const payload = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || additionalData.displayName || user.email?.split('@')[0] || 'Support Agent',
      photoURL: user.photoURL || null,
      role: assignedRole,
      roles: assignedRole,
      lastLoginAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      ...additionalData
    };
    await setDoc(userRef, payload, { merge: true });

    // Also mirror to email document key if it exists in Firebase Console
    if (user.email) {
      try {
        const emailDocKey = 'google-' + user.email.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(firestoreDb, USERS_COLLECTION, emailDocKey), payload, { merge: true });
      } catch (e) {}
    }

    return true;
  } catch (err) {
    console.warn('[Firestore] Failed to save user record:', err);
    return false;
  }
}

export function listenToUsers(onUpdate, onError) {
  if (!firestoreDb) return null;
  try {
    const colRef = collection(firestoreDb, USERS_COLLECTION);
    return onSnapshot(colRef, (snapshot) => {
      const usersList = [];
      snapshot.forEach((docSnap) => {
        usersList.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(usersList);
    }, (err) => {
      console.warn('[Firestore] Error listening to users:', err);
      if (onError) onError(err);
    });
  } catch (e) {
    if (onError) onError(e);
    return null;
  }
}

export async function updateUserRoleInFirestore(uid, newRole) {
  if (!firestoreDb || !uid) return false;
  try {
    const userRef = doc(firestoreDb, USERS_COLLECTION, uid);
    await setDoc(userRef, {
      role: newRole,
      roles: newRole,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to update user role:', err);
    return false;
  }
}

export function signalFreshSessionOnLogin(user) {
  try {
    localStorage.setItem('carebot_fresh_session_required', 'true');
    if (user) {
      localStorage.setItem('carebot_last_signed_in_uid', user.uid || user.email || 'agent');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnidesk-fresh-login', { detail: user }));
    }
  } catch (e) {
    console.warn('Failed to signal fresh session on login', e);
  }
}

export async function loginWithGoogle() {
  if (!firebaseAuth || !googleProvider) {
    initFirebase();
  }
  if (!firebaseAuth || !googleProvider) {
    throw new Error('Firebase Authentication is not ready. Please refresh or verify config.');
  }

  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    if (result?.user) {
      await saveUserToFirestore(result.user);
      signalFreshSessionOnLogin(result.user);
      return result.user;
    }
    throw new Error('No user returned from Google authentication.');
  } catch (popupErr) {
    console.error('[Firebase] Google sign in error:', popupErr);
    throw popupErr;
  }
}

export async function loginWithEmail(email, password) {
  const isMasterSuperAdmin = email?.toLowerCase().trim() === 'superadmin@gmail.com' && password === 'SuperAdmin123!';
  const fallbackRole = isMasterSuperAdmin ? 'Administrator' : 'Tier-1 Specialist';
  const fallbackName = isMasterSuperAdmin ? 'Super Administrator' : ((email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Support Specialist') || 'Support Specialist');

  if (!firebaseAuth) {
    const mock = setLocalDemoUser(fallbackName, fallbackRole, email || 'agent@omnidesk.ai');
    signalFreshSessionOnLogin(mock);
    return mock;
  }
  try {
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
    if (result?.user) {
      if (isMasterSuperAdmin) {
        await updateProfile(result.user, { displayName: 'Super Administrator' }).catch(() => {});
      }
      await saveUserToFirestore(result.user, isMasterSuperAdmin ? { role: 'Administrator', roles: 'Administrator', displayName: 'Super Administrator' } : {});
      signalFreshSessionOnLogin(result.user);
      return result.user;
    }
  } catch (authErr) {
    // If superadmin account does not exist in Firebase Auth yet, auto-provision it!
    if (isMasterSuperAdmin && (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-login-credentials')) {
      try {
        const created = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (created?.user) {
          await updateProfile(created.user, { displayName: 'Super Administrator' }).catch(() => {});
          await saveUserToFirestore(created.user, { role: 'Administrator', roles: 'Administrator', displayName: 'Super Administrator' });
          signalFreshSessionOnLogin(created.user);
          return created.user;
        }
      } catch (createErr) {
        console.warn('Could not auto-create superadmin in Firebase Auth, using local session:', createErr);
      }
    }
    console.warn('[Firebase] Email sign in error, activating local agent session:', authErr);
    const mock = setLocalDemoUser(fallbackName, fallbackRole, email || 'agent@omnidesk.ai');
    await saveUserToFirestore(mock, { role: fallbackRole, roles: fallbackRole });
    signalFreshSessionOnLogin(mock);
    return mock;
  }
  const mock = setLocalDemoUser(fallbackName, fallbackRole, email || 'agent@omnidesk.ai');
  signalFreshSessionOnLogin(mock);
  return mock;
}

export async function signupWithEmail(email, password, displayName) {
  const name = displayName || (email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Support Specialist') || 'Support Specialist';
  if (!firebaseAuth) {
    const mock = setLocalDemoUser(name, 'Tier-1 Specialist', email || 'agent@omnidesk.ai');
    signalFreshSessionOnLogin(mock);
    return mock;
  }
  try {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (name && result.user) {
      try { await updateProfile(result.user, { displayName: name }); } catch (e) {}
    }
    if (result?.user) {
      await saveUserToFirestore(result.user, { displayName: name });
      signalFreshSessionOnLogin(result.user);
      return result.user;
    }
  } catch (authErr) {
    console.warn('[Firebase] Signup error, activating local agent session:', authErr);
    const mock = setLocalDemoUser(name, 'Tier-1 Specialist', email || 'agent@omnidesk.ai');
    await saveUserToFirestore(mock);
    signalFreshSessionOnLogin(mock);
    return mock;
  }
  const mock = setLocalDemoUser(name, 'Tier-1 Specialist', email || 'agent@omnidesk.ai');
  signalFreshSessionOnLogin(mock);
  return mock;
}

export async function logoutUser() {
  if (firebaseAuth) {
    try {
      await signOut(firebaseAuth);
    } catch (e) {}
  }
  localStorage.removeItem('carebot_local_user');
  localStorage.setItem('carebot_fresh_session_required', 'true');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omnidesk-logout'));
  }
}

/**
 * Sets a local demo agent session if Firebase is not connected or popup is blocked.
 */
export function setLocalDemoUser(name = 'Support Specialist', role = 'Tier-1 Specialist', email = 'agent@omnidesk.ai') {
  const mock = {
    uid: 'agent-' + (email ? email.replace(/[^a-zA-Z0-9]/g, '_') : Date.now()),
    email: email || 'agent@omnidesk.ai',
    displayName: name || 'Support Specialist',
    photoURL: null,
    isLocal: true,
    role: role
  };
  try {
    localStorage.setItem('carebot_local_user', JSON.stringify(mock));
    localStorage.setItem('carebot_fresh_session_required', 'true');
    if (firestoreDb) {
      saveUserToFirestore(mock);
    }
  } catch (e) {
    console.warn('Failed to save local user', e);
  }
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

/* =========================================================================
   FIRESTORE: CONVERSATIONS & AI COACHING TELEMETRY
   Stores customer-support conversations, AI coaching feedback, sentiment,
   intent, urgency, escalation risk, and timestamps as requested.
   ========================================================================= */

const CONVERSATIONS_COLLECTION = 'conversations';

export async function saveConversationRecord({
  sessionId,
  ticketId,
  customerName,
  agentName,
  agentEmail,
  customerMessage,
  agentMessage,
  sentiment = 'neutral',
  intent = 'general',
  urgency = 'low',
  escalationRisk = 'low',
  aiCoachingFeedback = {},
  detectedLanguage = 'english'
}) {
  if (!firestoreDb) return false;
  try {
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(firestoreDb, CONVERSATIONS_COLLECTION, convId);

    const record = {
      id: convId,
      sessionId: String(sessionId || 'default'),
      ticketId: String(ticketId || sessionId || `TK-${Math.floor(2000 + Math.random() * 7000)}`),
      customerName: customerName || 'Customer',
      agentName: agentName || 'Support Agent',
      agentEmail: agentEmail || '',
      customerMessage: customerMessage || '',
      agentMessage: agentMessage || '',
      // Detailed AI Telemetry fields
      sentiment: String(sentiment),
      intent: String(intent),
      urgency: String(urgency),
      escalationRisk: String(escalationRisk),
      aiCoachingFeedback: {
        coachingTip: aiCoachingFeedback.coachingTip || '',
        knowledgeSuggestion: aiCoachingFeedback.knowledgeSuggestion || '',
        toneScore: Number(aiCoachingFeedback.toneScore ?? 8),
        empathyScore: Number(aiCoachingFeedback.empathyScore ?? 7),
        clarityScore: Number(aiCoachingFeedback.clarityScore ?? 8),
        suggestedReply: aiCoachingFeedback.suggestedReply || '',
      },
      detectedLanguage: detectedLanguage || 'english',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, record);
    console.log('[Firestore] Conversation & AI telemetry saved to Firestore:', convId);
    return true;
  } catch (err) {
    console.warn('[Firestore] Failed to save conversation record:', err);
    return false;
  }
}

export function listenToConversations(onUpdate, onError) {
  if (!firestoreDb) return null;
  try {
    const colRef = collection(firestoreDb, CONVERSATIONS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const convs = [];
      snapshot.forEach((d) => convs.push({ id: d.id, ...d.data() }));
      onUpdate(convs);
    }, (err) => {
      console.warn('[Firestore] Error listening to conversations:', err);
      if (onError) onError(err);
    });
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}
