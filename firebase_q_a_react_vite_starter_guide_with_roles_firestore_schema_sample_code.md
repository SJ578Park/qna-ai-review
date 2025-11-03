# Firebase Q&A (React+Vite) — Starter Guide

> 목표: 채팅 UI가 아닌 **게시글 인터페이스**로 Q&A를 만들고, **Auth + Roles(guest/admin)**, **Firestore 규칙/스키마**, **간단한 React 컴포넌트**까지 한 번에 시작할 수 있는 템플릿입니다.

---

## 0) 프로젝트 구조(제안)
```
qna-app/
├─ .env.local                    # Vite 환경변수 (VITE_)
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ firebase.ts                # Firebase 초기화
│  ├─ auth/
│  │  ├─ useAuth.ts             # 인증/역할 훅
│  │  └─ AdminGate.tsx          # admin 전용 가드
│  ├─ data/
│  │  ├─ types.ts               # 타입 정의
│  │  ├─ queries.ts             # Firestore read/write 래퍼
│  │  └─ rules.md               # 보안 규칙 메모
│  ├─ pages/
│  │  ├─ QuestionsList.tsx
│  │  ├─ QuestionDetail.tsx
│  │  ├─ AskQuestion.tsx
│  │  └─ AdminPanel.tsx
│  └─ components/
│     ├─ QuestionCard.tsx
│     ├─ AnswerItem.tsx
│     └─ AskAnswerForm.tsx
└─ firebase.json                 # (선택) 호스팅 등
```

---

## 1) Firestore 스키마(게시글 인터페이스 중심)

### 컬렉션 구성
- **`questions`** (루트)
  - 문서ID: `qid`
  - 필드 예시:
    - `title` (string)
    - `body` (string, markdown 허용 권장)
    - `tags` (array<string>)
    - `authorUid` (string|null, 익명 글이면 null)
    - `authorName` (string|null)
    - `createdAt` (timestamp, serverTimestamp)
    - `updatedAt` (timestamp)
    - `status` (string, `"open" | "answered" | "locked"`)
    - `officialAnswerId` (string|null, 관리자가 정한 공식 답변 참조)
    - `visibility` (string, `"public" | "private"`)(옵션)

- **`questions/{qid}/answers`** (서브컬렉션)
  - 문서ID: `aid`
  - 필드 예시:
    - `body` (string)
    - `authorUid` (string|null)
    - `authorName` (string|null)
    - `createdAt` (timestamp)
    - `updatedAt` (timestamp)
    - `isOfficial` (boolean, 기본 false; admin만 true 가능)

- **`users`** (루트)
  - 문서ID: `uid`
  - 필드 예시:
    - `displayName` (string)
    - `role` (string, `"guest" | "admin"` — *참고: 권한검증은 custom claims 권장*)
    - `createdAt` (timestamp)
    - `updatedAt` (timestamp)

- **`guides`** (선택: 학습/가이드 문서)
  - 필드 예시: `title`, `body`, `audience`(`"guest"|"admin"`), `createdAt`

> **서브컬렉션을 추천**하는 이유: 질문 상세 페이지에서 답변을 함께 로드/정렬하기 좋고, Firestore 쿼리/보안 규칙이 직관적입니다. (대안으로 `answers`를 루트로 두고 `questionId`로 역참조도 가능하지만, 이번 UI 목적엔 서브컬렉션이 편합니다.)

---

## 2) 역할 관리 전략

- **운영 권한(관리자)**은 **Firebase Auth Custom Claims**로 체크하는 것을 강력 추천합니다.
  - 이유: `users` 문서의 `role` 필드는 클라이언트가 조작할 수 있어 *신뢰 불가*. Rules에서 `request.auth.token.role == 'admin'`처럼 **토큰 기반** 검증이 안전합니다.
  - Custom Claims 부여는 Admin SDK(Cloud Functions, 서버 스크립트)로 1회 설정.

### 예: Custom Claims 설정(서버 측)
```js
// functions/setAdminClaim.js (예시 스크립트)
import admin from 'firebase-admin';
admin.initializeApp();

// 특정 UID에 admin 클레임 부여
await admin.auth().setCustomUserClaims('TARGET_UID', { role: 'admin' });
```

- **게스트**: 익명 로그인(Anonymous Auth) 사용 → `role: 'guest'`로 취급.

---

## 3) Firestore 보안 규칙(v2 예시)
> 아래 규칙은 학습용 템플릿입니다. 실제 프로덕션에선 프로젝트 요구에 맞게 세분화하세요.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return request.auth != null && request.auth.token.role == 'admin';
    }

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // users
    match /users/{uid} {
      // 본인 읽기/쓰기 허용, 관리자 전체 읽기/쓰기 허용
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isOwner(uid) || isAdmin();
    }

    // questions
    match /questions/{qid} {
      allow read: if true; // 공개 Q&A

      // 생성: 로그인 유저만
      allow create: if isSignedIn();

      // 수정: 소유자(작성자) 또는 관리자
      allow update, delete: if isAdmin() || (isSignedIn() && isOwner(resource.data.authorUid));

      // answers (subcollection)
      match /answers/{aid} {
        allow read: if true;

        // 답변 작성: 로그인 유저
        allow create: if isSignedIn();

        // 수정/삭제: 관리자 또는 답변 소유자
        allow update, delete: if isAdmin() || (isSignedIn() && isOwner(resource.data.authorUid));
      }
    }

    // guides: admin만 작성/수정, 모두 읽기(또는 audience로 필터링)
    match /guides/{gid} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

> **주의**: `isOwner(resource.data.authorUid)`는 문서 생성 시 `authorUid`를 서버에서 써줘야 안전합니다(클라이언트 임의변조 방지). 클라우드 함수나 보안 규칙에서 서버타임스탬프와 함께 강제 세팅을 권장합니다.

---

## 4) Vite + Firebase 초기 세팅

### 4-1) 환경변수(.env.local)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

### 4-2) `src/firebase.ts`
```ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureAnonymousLogin() {
  if (!auth.currentUser) await signInAnonymously(auth);
}

export function onAuth(cb: (user: import('firebase/auth').User|null)=>void){
  return onAuthStateChanged(auth, cb);
}
```

---

## 5) 타입 & 데이터 접근 래퍼

### 5-1) `src/data/types.ts`
```ts
export type Role = 'guest' | 'admin';

export type Question = {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  authorUid?: string|null;
  authorName?: string|null;
  createdAt: any; // Timestamp
  updatedAt?: any;
  status: 'open' | 'answered' | 'locked';
  officialAnswerId?: string|null;
};

export type Answer = {
  id: string;
  body: string;
  authorUid?: string|null;
  authorName?: string|null;
  createdAt: any;
  updatedAt?: any;
  isOfficial?: boolean;
};
```

### 5-2) `src/data/queries.ts` (핵심 CRUD 예시)
```ts
import { db, auth } from '../firebase';
import {
  collection, doc, addDoc, serverTimestamp, getDoc,
  getDocs, query, orderBy, limit, where, updateDoc,
} from 'firebase/firestore';

export async function createQuestion({ title, body, tags }: {title:string; body:string; tags?:string[]}) {
  const user = auth.currentUser;
  const ref = await addDoc(collection(db, 'questions'), {
    title, body, tags: tags ?? [],
    authorUid: user?.uid ?? null,
    authorName: user?.isAnonymous ? 'guest' : (user?.displayName ?? 'user'),
    createdAt: serverTimestamp(),
    status: 'open',
  });
  return ref.id;
}

export async function listQuestions({ top=20 }={}) {
  const q = query(collection(db, 'questions'), orderBy('createdAt','desc'), limit(top));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id: d.id, ...d.data() }));
}

export async function getQuestion(qid: string){
  const snap = await getDoc(doc(db, 'questions', qid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addAnswer(qid: string, body: string){
  const user = auth.currentUser;
  const ref = await addDoc(collection(db, 'questions', qid, 'answers'), {
    body,
    authorUid: user?.uid ?? null,
    authorName: user?.isAnonymous ? 'guest' : (user?.displayName ?? 'user'),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markOfficial(qid: string, aid: string){
  // Rules에서 admin만 허용하도록! 프런트는 호출만 담당
  await updateDoc(doc(db, 'questions', qid), { officialAnswerId: aid, status: 'answered' });
  await updateDoc(doc(db, 'questions', qid, 'answers', aid), { isOfficial: true });
}
```

---

## 6) 간단한 페이지/컴포넌트

### 6-1) `src/pages/QuestionsList.tsx`
```tsx
import { useEffect, useState } from 'react';
import { listQuestions } from '../data/queries';
import { Link } from 'react-router-dom';

export default function QuestionsList(){
  const [items, setItems] = useState<any[]>([]);
  useEffect(()=>{ (async()=> setItems(await listQuestions({top:50})))(); },[]);
  return (
    <div>
      <h1>Questions</h1>
      <Link to="/ask">Ask a Question</Link>
      <ul>
        {items.map(q=> (
          <li key={q.id}>
            <Link to={`/q/${q.id}`}>{q.title}</Link>
            {q.status === 'answered' && <span> ✅</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 6-2) `src/pages/AskQuestion.tsx`
```tsx
import { useState } from 'react';
import { createQuestion } from '../data/queries';
import { useNavigate } from 'react-router-dom';

export default function AskQuestion(){
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const nav = useNavigate();

  return (
    <form onSubmit={async e=>{e.preventDefault();
      const id = await createQuestion({ title, body });
      nav(`/q/${id}`);
    }}>
      <h1>Ask</h1>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" required />
      <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Body" required />
      <button type="submit">Post</button>
    </form>
  );
}
```

### 6-3) `src/pages/QuestionDetail.tsx` (요약)
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuestion, addAnswer } from '../data/queries';

export default function QuestionDetail(){
  const { id } = useParams();
  const [q, setQ] = useState<any|null>(null);
  const [answer, setAnswer] = useState('');

  useEffect(()=>{ (async()=> setQ(id ? await getQuestion(id) : null))(); },[id]);

  if(!q) return <div>Loading...</div>;

  return (
    <div>
      <h1>{q.title}</h1>
      <p>{q.body}</p>
      <h2>Answers</h2>
      {/* 실제로는 onSnapshot으로 실시간 구독 권장 */}
      {/* ... answers 리스트 렌더링 생략 ... */}

      <form onSubmit={async e=>{e.preventDefault(); if(!id) return; await addAnswer(id, answer); setAnswer('');}}>
        <textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Write an answer..."/>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
```

---

## 7) 라우팅/부트스트랩 (요약)

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import QuestionsList from './pages/QuestionsList';
import AskQuestion from './pages/AskQuestion';
import QuestionDetail from './pages/QuestionDetail';
import { ensureAnonymousLogin } from './firebase';

ensureAnonymousLogin();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<QuestionsList/>} />
          <Route path="/ask" element={<AskQuestion/>} />
          <Route path="/q/:id" element={<QuestionDetail/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 8) 인덱스 권장
- `questions`: `createdAt desc` 단일 인덱스(자동)
- 태그/상태 필터가 있으면 컴포지트 인덱스:
  - `status asc, createdAt desc`
  - `tags array-contains, createdAt desc`

---

## 9) Admin 기능(핵심 시나리오)
- **공식 답변 지정**: `markOfficial(qid, aid)` 호출 → Rules에서 admin만 허용.
- **락/삭제**: `status = 'locked'`로 변경(관리자). 락이면 일반 유저 `answers` 생성 차단하도록 규칙 추가 가능.
- **가이드 문서**: `guides`에 role별 문서 작성(admin). 클라에서 `audience`로 필터링.

---

## 10) 다음 단계(선택)
- **실시간 구독**: `onSnapshot`으로 질문/답변 실시간 갱신.
- **권한 강화**: 서버 사이드에서 질문/답변 생성 시 `authorUid` 강제 세팅(Callable Function/Extension).
- **RAG 연결**: 질문 저장과 동시에 Cloud Functions → 임베딩/색인 파이프라인으로 push(Genkit).
- **평가/승인 루프**: 관리자 패널에서 초안/수정 관리 후 승인 시 공개로 반영.
- **UI/UX**: 마크다운 뷰어, 태그 필터, 검색, 무한스크롤.

---

### 체크리스트 요약
- [x] 컬렉션: `questions` + `answers(서브)` + `users`(+ `guides`)
- [x] 권한: **Custom Claims 기반 admin**
- [x] 규칙: owner/admin 권한 예시 제공
- [x] Vite+React 부트스트랩 & 익명로그인
- [x] CRUD 샘플 코드
- [x] 인덱스 가이드

이 템플릿대로 시작하고, 구현 중 막히는 포인트를 질문해 주세요. 역할 세분화/승인 큐/Genkit 연동도 이어서 확장해 드립니다.

