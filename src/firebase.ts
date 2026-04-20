import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// You MUST use the firestoreDatabaseId from the firebase-applet-config.json file
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

// Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test Connection function (required by instructions)
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection Verified");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Error Handling Definition
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null) {
  if (error && error.message && error.message.includes('Missing or insufficient permissions')) {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: user ? {
        userId: user.uid,
        email: user.email || '',
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        providerInfo: user.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        }))
      } : {
        userId: 'unauthenticated', email: '', emailVerified: false, isAnonymous: true, providerInfo: []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

// Global Auth / Capital API
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Attempt to register/update user in the global schema
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef).catch(err => { console.warn(err); return null; });
    
    if (!userSnap || !userSnap.exists()) {
      try {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName || 'Asistente Configurado',
          photoURL: user.photoURL || null,
          role: 'user', // Initial role, admin bootstrapping takes manually or by specific rules
          createdAt: serverTimestamp()
        });
        
        await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
          email: user.email,
          emailVerified: user.emailVerified,
          signInProvider: 'google.com'
        });
      } catch (err) {
        handleFirestoreError(err, 'create', `users/${user.uid}`);
      }
    }
    return user;
  } catch (error) {
    console.error("Authentication Error:", error);
    throw error;
  }
}

export async function logout() {
  return signOut(auth);
}

// Fetch Capital Distribution Transactions
export async function fetchCapitalTransactions(userId: string) {
  try {
    const q = query(collection(db, 'capital_transactions'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    handleFirestoreError(err, 'list', 'capital_transactions');
    return [];
  }
}
