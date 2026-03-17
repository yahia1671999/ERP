import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show user-friendly alert
  let message = 'حدث خطأ في قاعدة البيانات';
  if (errInfo.error.includes('permission-denied') || errInfo.error.includes('Missing or insufficient permissions')) {
    message = 'ليس لديك صلاحية للقيام بهذا الإجراء. يرجى التأكد من تفعيل حسابك ومنحك الصلاحيات اللازمة من قبل المسؤول.';
  }
  
  // We use a custom alert if possible, but window.alert is not allowed in iframe.
  // However, the baseline says "try to avoid using APIs such as window.alert or window.open".
  // I'll use a custom event to show a toast or alert in the main App component.
  window.dispatchEvent(new CustomEvent('firestore-error', { detail: message }));
  
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
