import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin.js';

const REGION = process.env.FUNCTION_REGION ?? 'asia-northeast3';

interface MessageSnapshot {
  status?: string;
  kind?: string;
  content?: string;
  role?: string;
  aiGenerated?: boolean;
  approvedAt?: FirebaseFirestore.Timestamp;
  approvedBy?: string;
  turn?: number;
  createdAt?: FirebaseFirestore.Timestamp;
}

async function upsertTrainingSample(qid: string, mid: string) {
  const questionRef = db.collection('questions').doc(qid);

  const [questionSnap, messagesSnap] = await Promise.all([
    questionRef.get(),
    questionRef.collection('messages').orderBy('turn', 'asc').get(),
  ]);

  if (!questionSnap.exists) {
    logger.warn('학습 데이터 수집 중 질문 문서를 찾지 못했습니다.', { qid, mid });
    return;
  }

  const questionData = questionSnap.data() ?? {};
  const messages = messagesSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as MessageSnapshot),
  }));

  messages.sort((a, b) => {
    if ((a.turn ?? 0) !== (b.turn ?? 0)) {
      return (a.turn ?? 0) - (b.turn ?? 0);
    }
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return aTime - bTime;
  });

  const answerMessage = messages.find((msg) => msg.id === mid);
  if (!answerMessage) {
    logger.warn('학습 데이터 수집 중 답변 메시지를 찾지 못했습니다.', { qid, mid });
    return;
  }

  const conversation = messages.map((msg) => ({
    id: msg.id,
    kind: msg.kind ?? null,
    role: msg.role ?? null,
    status: msg.status ?? null,
    content: msg.content ?? null,
    aiGenerated: msg.aiGenerated ?? false,
    turn: msg.turn ?? null,
    createdAt: msg.createdAt ?? null,
    approvedAt: msg.approvedAt ?? null,
    approvedBy: msg.approvedBy ?? null,
  }));

  await db.collection('answerTrainingSamples').doc(`${qid}_${mid}`).set(
    {
      question: {
        id: qid,
        title: questionData.title ?? null,
        body: questionData.body ?? null,
        tags: questionData.tags ?? [],
        authorUid: questionData.authorUid ?? null,
        authorName: questionData.authorName ?? null,
        createdAt: questionData.createdAt ?? null,
      },
      answer: {
        id: mid,
        content: answerMessage.content ?? null,
        role: answerMessage.role ?? null,
        status: answerMessage.status ?? null,
        aiGenerated: answerMessage.aiGenerated ?? false,
        approvedAt: answerMessage.approvedAt ?? null,
        approvedBy: answerMessage.approvedBy ?? null,
        createdAt: answerMessage.createdAt ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      conversation,
      lastStatus: answerMessage.status ?? null,
      collectedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.info('승인된 답변을 학습 데이터로 수집했습니다.', { qid, mid });
}

export const onAnswerCreated = onDocumentCreated(
  {
    document: 'questions/{qid}/messages/{mid}',
    region: REGION,
  },
  async (event) => {
    const data = event.data?.data() as MessageSnapshot | undefined;
    if (!data) return;

    if (data.kind !== 'answer') return;

    const { qid, mid } = event.params;

    try {
      await upsertTrainingSample(qid, mid);
    } catch (error) {
      logger.error('승인된 답변 수집 중 오류(생성)', error as Error, { qid, mid });
    }
  }
);

export const onAnswerApproved = onDocumentUpdated(
  {
    document: 'questions/{qid}/messages/{mid}',
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before?.data() as MessageSnapshot | undefined;
    const after = event.data?.after?.data() as MessageSnapshot | undefined;

    if (!before || !after) return;

    if (after.kind !== 'answer') return;

    const { qid, mid } = event.params;

    try {
      await upsertTrainingSample(qid, mid);
    } catch (error) {
      logger.error('승인된 답변 수집 중 오류(상태 변경)', error as Error, { qid, mid });
    }
  }
);
