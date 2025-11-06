import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// 환경변수 확인 및 검증
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;

// 환경변수 누락 확인
if (!apiKey || !authDomain || !projectId || !appId) {
  const missing = [];
  if (!apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!appId) missing.push('VITE_FIREBASE_APP_ID');
  
  console.error('❌ Firebase 환경변수가 누락되었습니다:', missing);
  console.error('💡 .env 또는 .env.local 파일을 프로젝트 루트에 생성하고 필요한 환경변수를 설정해주세요.');
  throw new Error(`Firebase 환경변수 누락: ${missing.join(', ')}`);
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  appId,
  messagingSenderId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 이메일 로그인 함수
export async function signIn(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// 이메일 회원가입 함수
export async function signUp(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // users collection에 사용자 프로필 저장 (role: 'user')
  await setDoc(doc(db, 'users', user.uid), {
    displayName: user.displayName || email.split('@')[0],
    email: user.email,
    role: 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return userCredential;
}

// 로그아웃 함수
export async function logout() {
  return await signOut(auth);
}

// 인증 상태 변경 감지
export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

