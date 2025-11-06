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
import type { Question, Answer, Message, MessageStatus } from './types';

async function recalcQuestionAnswerState(qid: string): Promise<void> {
  const questionRef = doc(db, 'questions', qid);
  const questionSnap = await getDoc(questionRef);
  if (!questionSnap.exists()) return;

  const currentData = questionSnap.data() as Partial<Question>;
  const isLocked = currentData.status === 'locked';

  const draftQuery = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'draft'),
    where('kind', '==', 'answer'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const draftSnap = await getDocs(draftQuery);
  if (!draftSnap.empty) {
    const draftData = draftSnap.docs[0].data() as Partial<Message>;
    const draftUpdates: Record<string, unknown> = {
      hasDraftAnswer: true,
      pendingAnswerSource: draftData.role ?? null,
      pendingAnswerUpdatedAt: serverTimestamp(),
    };
    if (!isLocked) {
      draftUpdates.status = 'pending';
    }
    await updateDoc(questionRef, draftUpdates);
    return;
  }

  const approvedQuery = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'approved'),
    where('kind', '==', 'answer'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const approvedSnap = await getDocs(approvedQuery);
  if (!approvedSnap.empty) {
    const approvedUpdates: Record<string, unknown> = {
      hasDraftAnswer: false,
      pendingAnswerSource: null,
      pendingAnswerUpdatedAt: null,
    };
    if (!isLocked) {
      approvedUpdates.status = 'answered';
    }
    await updateDoc(questionRef, approvedUpdates);
    return;
  }

  const fallbackUpdates: Record<string, unknown> = {
    hasDraftAnswer: false,
    pendingAnswerSource: null,
    pendingAnswerUpdatedAt: null,
  };
  if (!isLocked) {
    fallbackUpdates.status = 'open';
  }
  await updateDoc(questionRef, fallbackUpdates);
}

// 질문 생성
export async function createQuestion({
  title,
  body,
  tags = [],
  createInitialMessage = true,
}: {
  title: string;
  body: string;
  tags?: string[];
  createInitialMessage?: boolean;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const now = serverTimestamp();
  const ref = await addDoc(collection(db, 'questions'), {
    title,
    body,
    tags: tags ?? [],
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'user',
    createdAt: now,
    updatedAt: now,
    status: 'open',
    officialAnswerId: null,
    lastMessageAt: now,
    visibility: 'public',
    hasDraftAnswer: false,
    pendingAnswerSource: null,
    pendingAnswerUpdatedAt: null,
  });

  // 초기 메시지 복제 (선택)
  if (createInitialMessage) {
    await addDoc(collection(db, 'questions', ref.id, 'messages'), {
      content: body,
      role: 'user' as const,
      kind: 'question' as const,
      status: 'approved' as const,
      turn: 0,
      authorUid: user.uid,
      authorName: user.displayName || user.email || 'user',
      createdAt: now,
      updatedAt: now,
    });
  }

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

export function subscribeQuestion(
  qid: string,
  callback: (question: Question | null) => void
) {
  const ref = doc(db, 'questions', qid);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({
      id: snap.id,
      ...snap.data(),
      createdAt: snap.data().createdAt as Timestamp,
      updatedAt: snap.data().updatedAt as Timestamp,
    } as Question);
  });
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

// ===== Messages API (새로운 멀티턴 구조) =====

// 메시지 추가
export async function addMessage(
  qid: string,
  msg: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'turn'> & { turn?: number }
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  // 마지막 메시지의 turn 값을 가져와서 +1
  const lastMessagesQuery = query(
    collection(db, 'questions', qid, 'messages'),
    orderBy('turn', 'desc'),
    limit(1)
  );
  const lastSnap = await getDocs(lastMessagesQuery);
  const nextTurn = lastSnap.empty ? 0 : (lastSnap.docs[0].data().turn as number) + 1;

  const ref = await addDoc(collection(db, 'questions', qid, 'messages'), {
    ...msg,
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'user',
    turn: nextTurn, // 전달된 turn 값은 무시하고 자동 계산된 값 사용
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const questionRef = doc(db, 'questions', qid);
  const questionUpdates: Record<string, unknown> = {
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (msg.kind === 'question') {
    questionUpdates.status = 'open';
  }

  if (msg.kind === 'answer') {
    if (msg.status === 'approved') {
      questionUpdates.status = 'answered';
      questionUpdates.hasDraftAnswer = false;
      questionUpdates.pendingAnswerSource = null;
      questionUpdates.pendingAnswerUpdatedAt = null;
    } else {
      questionUpdates.status = 'pending';
      questionUpdates.hasDraftAnswer = true;
      questionUpdates.pendingAnswerSource = msg.role ?? null;
      questionUpdates.pendingAnswerUpdatedAt = serverTimestamp();
    }
  }

  await updateDoc(questionRef, questionUpdates);

  if ((msg.role === 'admin' || msg.role === 'ai') && msg.kind === 'answer') {
    await recalcQuestionAnswerState(qid);
  }

  return ref.id;
}

// 공개 메시지 구독 (approved 상태만)
export function subscribeApprovedMessages(
  qid: string,
  cb: (msgs: Message[]) => void
) {
  const q = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'approved'),
    orderBy('turn', 'asc'),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt as Timestamp,
      updatedAt: d.data().updatedAt as Timestamp,
      approvedAt: d.data().approvedAt as Timestamp | undefined,
    })) as Message[];
    cb(msgs);
  });
}

// 초안 메시지 구독 (관리자용)
export function subscribeDraftMessages(
  qid: string,
  cb: (msgs: Message[]) => void
) {
  const q = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'draft'),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt as Timestamp,
      updatedAt: d.data().updatedAt as Timestamp,
    })) as Message[];
    cb(msgs);
  });
}

export function subscribeAllMessages(
  qid: string,
  cb: (msgs: Message[]) => void
) {
  const q = query(collection(db, 'questions', qid, 'messages'), orderBy('turn', 'asc'));

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt as Timestamp,
        updatedAt: d.data().updatedAt as Timestamp,
        approvedAt: d.data().approvedAt as Timestamp | undefined,
      })) as Message[];

    msgs.sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return aTime - bTime;
    });
    cb(msgs);
  });
}

// 사용자가 볼 수 있는 메시지 구독 (approved 메시지 + 사용자가 작성한 draft 메시지)
export function subscribeUserVisibleMessages(
  qid: string,
  userId: string | null,
  cb: (msgs: Message[]) => void
) {
  if (!userId) {
    // 로그인하지 않은 사용자는 approved 메시지만 볼 수 있음
    return subscribeApprovedMessages(qid, cb);
  }

  // approved 메시지 구독
  const approvedQuery = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'approved'),
    orderBy('turn', 'asc'),
    orderBy('createdAt', 'asc')
  );

  // 사용자가 작성한 draft 메시지 구독
  const draftQuery = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'draft'),
    where('authorUid', '==', userId),
    orderBy('createdAt', 'asc')
  );

  let approvedMessages: Message[] = [];
  let draftMessages: Message[] = [];

  const unsubscribeApproved = onSnapshot(approvedQuery, (snap) => {
    approvedMessages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt as Timestamp,
      updatedAt: d.data().updatedAt as Timestamp,
      approvedAt: d.data().approvedAt as Timestamp | undefined,
    })) as Message[];
    mergeAndCallback();
  });

  const unsubscribeDraft = onSnapshot(draftQuery, (snap) => {
    draftMessages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt as Timestamp,
      updatedAt: d.data().updatedAt as Timestamp,
    })) as Message[];
    mergeAndCallback();
  });

  const mergeAndCallback = () => {
    // turn과 createdAt으로 정렬하여 병합
    const allMessages = [...approvedMessages, ...draftMessages];
    allMessages.sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return aTime - bTime;
    });
    cb(allMessages);
  };

  return () => {
    unsubscribeApproved();
    unsubscribeDraft();
  };
}

// 모든 초안 메시지 구독 (관리자용, 전체 질문)
export function subscribeAllDraftMessages(cb: (msgs: Array<Message & { qid: string }>) => void) {
  // Firestore에서는 서브컬렉션에 대한 직접 쿼리가 제한적이므로
  // 질문별로 구독하거나, 클라우드 함수를 통해 조회하는 것이 좋습니다.
  // 여기서는 간단히 빈 배열을 반환하는 구조로 두고, 필요시 확장합니다.
  // 실제 구현은 클라우드 함수를 통해 하는 것을 권장합니다.
  cb([]);
}

// 메시지 승인 (관리자 전용)
export async function approveMessage(
  qid: string,
  mid: string,
  content?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const messageRef = doc(db, 'questions', qid, 'messages', mid);
  const messageSnap = await getDoc(messageRef);
  if (!messageSnap.exists()) {
    throw new Error('메시지를 찾을 수 없습니다.');
  }
  const original = messageSnap.data() as Message;

  const updates: any = {
    status: 'approved' as MessageStatus,
    approvedAt: serverTimestamp(),
    approvedBy: user.uid,
    updatedAt: serverTimestamp(),
  };

  if (content !== undefined) {
    updates.content = content;
  }

  await updateDoc(messageRef, updates);
  await updateDoc(doc(db, 'questions', qid), {
    updatedAt: serverTimestamp(),
  });

  if (original.kind === 'answer') {
    await recalcQuestionAnswerState(qid);
  }
}

// 메시지 수정
export async function updateMessage(
  qid: string,
  mid: string,
  content: string
): Promise<void> {
  const messageRef = doc(db, 'questions', qid, 'messages', mid);
  const messageSnap = await getDoc(messageRef);
  if (!messageSnap.exists()) {
    throw new Error('메시지를 찾을 수 없습니다.');
  }
  const original = messageSnap.data() as Message;

  await updateDoc(messageRef, {
    content,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'questions', qid), {
    updatedAt: serverTimestamp(),
  });

  if (original.kind === 'answer') {
    await recalcQuestionAnswerState(qid);
  }
}

// 메시지 삭제
export async function deleteMessage(qid: string, mid: string): Promise<void> {
  const messageRef = doc(db, 'questions', qid, 'messages', mid);
  const messageSnap = await getDoc(messageRef);
  const original = messageSnap.exists() ? (messageSnap.data() as Message) : null;

  await deleteDoc(messageRef);

  await updateDoc(doc(db, 'questions', qid), {
    updatedAt: serverTimestamp(),
  });

  if (original?.kind === 'answer') {
    await recalcQuestionAnswerState(qid);
  }
}
