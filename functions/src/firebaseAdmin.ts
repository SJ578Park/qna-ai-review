import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function ensureApp() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getApp();
}

export const app = ensureApp();
export const db = getFirestore(app);
