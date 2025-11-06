멀티턴 대화를 위해 기존 answers 서브컬렉션 대신 messages 서브컬렉션을 도입합니다. 모든 발화를 messages/{mid} 문서로 저장하고, 역할과 상태를 필드로 구분합니다.

2.1. 컬렉션 구조

questions/{qid} – 스레드(최초 질문)의 메타데이터를 저장합니다.

title: 최초 질문 제목

body: 최초 질문 본문(또는 첫 메시지로 복제)

authorUid, createdAt, status (open|answered|locked)

lastMessageAt: 마지막 메시지 시각 (정렬용)

officialAnswerId: 공식 답변으로 지정된 메시지 ID (선택)

questions/{qid}/messages/{mid} – 대화의 각 발화를 저장합니다.

필드	설명
role	user|admin|ai – 누가 말했는지
kind	question|answer|note – 메시지 유형
content	메시지 본문
status	draft|approved|rejected|superseded – 관리자 확인 단계
aiGenerated	AI 초안 여부(true/false)
sources	RAG에서 회수한 문서/근거 메타데이터 배열
riskFlags	모델 경고(예: 정책 위반, 환각)
inReplyTo	대댓글/후속 질문일 경우 부모 메시지 ID
turn	대화 턴 번호(정렬에 사용) – 0부터 증가
authorUid & authorName	작성자 정보
createdAt, updatedAt	타임스탬프
approvedAt, approvedBy	관리자가 승인한 시각 및 UID
revision, revisionOf	수정 이력(선택)

이 구조를 사용하면 최초 질문, 후속 질문, AI 답변, 관리자 답변 등 모든 메시지를 한 컬렉션에서 관리할 수 있습니다. status가 approved인 메시지만 사용자에게 공개하며, draft 메시지는 관리자에게만 표시합니다.

2.2. 보안 규칙 v2 예시

아래는 권한 요지입니다. 규칙을 배포할 때 기존 규칙에 추가·수정해 주세요.

rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin()    { return request.auth != null && request.auth.token.role == 'admin'; }
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }

    match /questions/{qid} {
      allow read: if true; // 질문은 모두 읽을 수 있음
      allow create: if isSignedIn();
      allow update, delete: if isAdmin() || (isSignedIn() && isOwner(resource.data.authorUid));

      match /messages/{mid} {
        // 초안은 관리자만 읽을 수 있고, 승인된 메시지만 사용자에게 노출
        allow read: if isAdmin() || (resource.data.status == 'approved');

        // 메시지 생성: 로그인한 모든 사용자 (AI 초안은 서버 함수가 작성)
        allow create: if isSignedIn();

        // 메시지 업데이트/삭제: 관리자이거나 본인의 draft만 가능
        allow update, delete: if
          isAdmin() ||
          (isSignedIn() &&
           isOwner(resource.data.authorUid) &&
           resource.data.status == 'draft' &&
           request.resource.data.status == 'draft');

        // draft → approved 전환은 관리자만 가능
        allow update: if isAdmin();
      }
    }
  }
}


Tip: 클라이언트에서 메시지를 쿼리할 때 반드시 where('status', '==', 'approved') 필터를 포함해야 위 규칙을 통과할 수 있습니다. 초안까지 보려면 관리자 권한으로 별도 쿼리를 실행합니다.

2.3. 타입 정의 예시 (src/data/types.ts)
export type MessageStatus = 'draft' | 'approved' | 'rejected' | 'superseded';
export type MessageRole   = 'user' | 'admin' | 'ai';
export type MessageKind   = 'question' | 'answer' | 'note';

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  kind: MessageKind;
  status: MessageStatus;
  aiGenerated?: boolean;
  sources?: Array<{ docId?: string; snippet?: string }>;
  riskFlags?: string[];
  inReplyTo?: string | null;
  turn: number;
  authorUid?: string | null;
  authorName?: string | null;
  createdAt: any;
  updatedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  revision?: number;
  revisionOf?: string | null;
}


Question 타입은 기존과 동일하되, 대화형으로 사용할 경우 초기 메시지를 messages에 복제해도 됩니다. Answer 타입은 더 이상 사용하지 않으므로 정리하세요.

2.4. 데이터 액세스 함수 수정

src/data/queries.ts에 다음과 같이 함수들을 추가하거나 수정합니다:

질문 생성 시 초기 메시지 복제(선택): 질문 생성 후 messages 서브컬렉션에 첫 메시지(role: 'user', kind: 'question')를 저장하고, turn 값을 0으로 설정합니다.

메시지 추가:

export async function addMessage(qid: string, msg: Omit<Message, 'id' | 'createdAt'>) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  await addDoc(collection(db, 'questions', qid, 'messages'), {
    ...msg,
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}


공개 메시지 구독:

export function subscribeApprovedMessages(qid: string, cb: (msgs: Message[]) => void) {
  const q = query(
    collection(db, 'questions', qid, 'messages'),
    where('status', '==', 'approved'),
    orderBy('turn', 'asc'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
    cb(msgs);
  });
}


초안 메시지 구독(관리자): where('status','==','draft') 필터를 사용합니다.

승인/수정: callable 함수 approveMessage를 사용해 status를 approved로 변경하고 수정된 content와 approvedAt/By를 업데이트합니다.