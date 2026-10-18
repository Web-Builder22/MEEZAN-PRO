import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics if supported in the current environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized successfully.');
    }
  }).catch(() => {
    // Ignore unsupported environment gracefully
  });
}

// CRITICAL: Initialize Firestore with the provisioned database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Connection test on boot as required by Firebase Integration
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Successfully verified Firestore connectivity.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Error Handling Specification as defined in Firebase integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Map Firebase Auth error codes to user-friendly messages
export function formatFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code === 'auth/unauthorized-domain') {
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return `This domain (${domain}) is not authorized for Google Sign-In in your Firebase project. Please add "${domain}" in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return `This sign-in provider is not enabled in your Firebase Project. Please enable it in Firebase Console (Authentication → Sign-in method), or sign in with Google directly.`;
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google Sign-In popup was closed before completing.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with the same email address using a different sign-in method.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password. Please verify your credentials or create a new account.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please log in instead or use Google Sign-In.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (message.includes("Failed to execute 'json' on 'Response'") || message.includes('Unexpected end of JSON input')) {
    return 'Server returned an empty or invalid response during sign-in sync. Please try again.';
  }
  return message || 'Authentication failed. Please try again.';
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  type FirebaseUser
};

