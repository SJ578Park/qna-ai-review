import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin.js';
import { generateDraftAnswer } from '../ai/draftAnswer.js';

interface FirestoreMessage {
  content: string;
  role: string;
  kind: string;
  status: string;
  authorUid?: string | null;
  authorName?: string | null;
  turn?: number;
  aiGenerated?: boolean;
  createdAt?: FirebaseFirestore.Timestamp;
}

interface FirestoreQuestion {
  title: string;
  body: string;
  tags?: string[];
  authorName?: string | null;
  status?: string;
  hasDraftAnswer?: boolean;
  pendingAnswerSource?: string | null;
}

const REGION = process.env.FUNCTION_REGION ?? 'asia-northeast3';

export const onQuestionMessageCreated = onDocumentCreated(
  {
    document: 'questions/{qid}/messages/{mid}',
    region: REGION,
  },
  async (event) => {
    const message = event.data?.data() as FirestoreMessage | undefined;
    if (!message) {
      return;
    }

    if (message.role === 'ai' || message.kind !== 'question') {
      return;
    }

    if (message.status && message.status !== 'approved') {
      // Draft 질문에 대해서는 응답하지 않습니다.
      return;
    }

    const qid = event.params.qid as string;
    const questionRef = db.collection('questions').doc(qid);
    const questionSnap = await questionRef.get();

    if (!questionSnap.exists) {
      logger.warn('자동 응답을 시도했지만 질문 문서를 찾을 수 없습니다.', { qid });
      return;
    }

    const questionData = questionSnap.data() as FirestoreQuestion;
    const status = questionData.status ?? 'open';

    if (status === 'locked') {
      logger.debug('잠긴 질문에는 자동 응답을 생성하지 않습니다.', { qid });
      return;
    }

    if (questionData.hasDraftAnswer) {
      logger.debug('이미 초안 답변이 존재하여 자동 응답을 건너뜁니다.', { qid });
      return;
    }

    if (status === 'answered') {
      logger.debug('이미 해결된 질문에는 자동 응답을 생성하지 않습니다.', { qid });
      return;
    }

    const messagesRef = questionRef.collection('messages');
    const historySnap = await messagesRef.orderBy('turn', 'asc').limit(20).get();

    const history = historySnap.docs.map((docSnap) => {
      const payload = docSnap.data() as FirestoreMessage;
      return {
        role: payload.role,
        kind: payload.kind,
        content: payload.content,
      };
    });

    const lastTurnSnap = await messagesRef.orderBy('turn', 'desc').limit(1).get();
    const nextTurn = lastTurnSnap.empty
      ? 0
      : (() => {
          const lastDoc = lastTurnSnap.docs[0];
          const lastData = lastDoc.data() as FirestoreMessage;
          const lastTurn = typeof lastData.turn === 'number' ? lastData.turn : -1;
          return lastTurn + 1;
        })();

    try {
      const draftContent = await generateDraftAnswer({
        question: {
          title: questionData.title,
          body: questionData.body,
          tags: questionData.tags ?? [],
          authorName: questionData.authorName ?? null,
        },
        history,
      });

      const aiMessageRef = messagesRef.doc();
      const now = FieldValue.serverTimestamp();

      await db.runTransaction(async (transaction) => {
        const freshQuestionSnap = await transaction.get(questionRef);
        const freshData = freshQuestionSnap.data() as FirestoreQuestion | undefined;
        if (!freshData) {
          throw new Error('질문 문서를 찾을 수 없습니다.');
        }
        if (freshData.hasDraftAnswer) {
          logger.debug('트랜잭션 중 확인: 이미 초안이 존재하여 자동 응답을 중단합니다.', { qid });
          return;
        }

        const currentStatus = freshData.status ?? 'open';

        transaction.set(aiMessageRef, {
          content: draftContent,
          role: 'ai',
          kind: 'answer',
          status: 'draft',
          aiGenerated: true,
          authorUid: null,
          authorName: 'AI Draft',
          turn: nextTurn,
          createdAt: now,
          updatedAt: now,
        });

        transaction.update(questionRef, {
          hasDraftAnswer: true,
          pendingAnswerSource: 'ai',
          pendingAnswerUpdatedAt: now,
          lastMessageAt: now,
          status: currentStatus === 'locked' ? currentStatus : 'pending',
          updatedAt: now,
        });
      });

      logger.info('자동 답변 초안을 생성했습니다.', { qid, mid: aiMessageRef.id });
    } catch (error) {
      logger.error('자동 응답 생성 중 오류가 발생했습니다.', error as Error, { qid });
    }
  }
);
