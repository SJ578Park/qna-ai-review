import { db, auth } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import type { Question, Answer } from './types';

// 질문 생성
export async function createQuestion({
  title,
  body,
  tags = [],
}: {
  title: string;
  body: string;
  tags?: string[];
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const ref = await addDoc(collection(db, 'questions'), {
    title,
    body,
    tags: tags ?? [],
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'open',
    officialAnswerId: null,
    visibility: 'public',
  });
  return ref.id;
}

// 질문 목록 조회
export async function listQuestions({ top = 20, status }: { top?: number; status?: Question['status'] } = {}): Promise<Question[]> {
  let q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(top));
  
  if (status) {
    q = query(collection(db, 'questions'), where('status', '==', status), orderBy('createdAt', 'desc'), limit(top));
  }
  
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt as Timestamp,
    updatedAt: d.data().updatedAt as Timestamp,
  })) as Question[];
}

// 질문 실시간 구독
export function subscribeQuestions(
  callback: (questions: Question[]) => void,
  { top = 20 }: { top?: number } = {}
) {
  const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(top));
  
  return onSnapshot(q, (snap) => {
    const questions = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt as Timestamp,
      updatedAt: d.data().updatedAt as Timestamp,
    })) as Question[];
    callback(questions);
  });
}

// 질문 조회
export async function getQuestion(qid: string): Promise<Question | null> {
  const snap = await getDoc(doc(db, 'questions', qid));
  if (!snap.exists()) return null;
  
  return {
    id: snap.id,
    ...snap.data(),
    createdAt: snap.data().createdAt as Timestamp,
    updatedAt: snap.data().updatedAt as Timestamp,
  } as Question;
}

// 질문 수정
export async function updateQuestion(qid: string, updates: Partial<Pick<Question, 'title' | 'body' | 'tags' | 'status'>>): Promise<void> {
  await updateDoc(doc(db, 'questions', qid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// 질문 삭제
export async function deleteQuestion(qid: string): Promise<void> {
  await deleteDoc(doc(db, 'questions', qid));
}

// 답변 추가
export async function addAnswer(qid: string, body: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const ref = await addDoc(collection(db, 'questions', qid, 'answers'), {
    body,
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isOfficial: false,
  });
  return ref.id;
}

// 답변 목록 조회
export async function listAnswers(qid: string): Promise<Answer[]> {
  const q = query(collection(db, 'questions', qid, 'answers'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt as Timestamp,
    updatedAt: d.data().updatedAt as Timestamp,
  })) as Answer[];
}

// 답변 실시간 구독
export function subscribeAnswers(qid: string, callback: (answers: Answer[]) => void) {
  const q = query(collection(db, 'questions', qid, 'answers'), orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snap) => {
    const answers = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt as Timestamp,
      updatedAt: d.data().updatedAt as Timestamp,
    })) as Answer[];
    callback(answers);
  });
}

// 공식 답변 지정 (관리자 전용)
export async function markOfficial(qid: string, aid: string): Promise<void> {
  await updateDoc(doc(db, 'questions', qid), {
    officialAnswerId: aid,
    status: 'answered',
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'questions', qid, 'answers', aid), {
    isOfficial: true,
    updatedAt: serverTimestamp(),
  });
}

// 답변 수정
export async function updateAnswer(qid: string, aid: string, body: string): Promise<void> {
  await updateDoc(doc(db, 'questions', qid, 'answers', aid), {
    body,
    updatedAt: serverTimestamp(),
  });
}

// 답변 삭제
export async function deleteAnswer(qid: string, aid: string): Promise<void> {
  await deleteDoc(doc(db, 'questions', qid, 'answers', aid));
}

