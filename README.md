# Q&A AI Review

Firebase를 활용한 Q&A 게시판 애플리케이션입니다.

## 기능

- 이메일 인증을 통한 로그인/회원가입
- 질문 작성 및 조회
- 답변 작성 및 조회
- 관리자 권한을 통한 질문 관리
- 실시간 질문/답변 업데이트

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일에 Firebase 설정 정보를 추가하세요:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
```

### 3. Firebase 설정

#### Firestore 보안 규칙 설정

Firebase Console에서 `firestore.rules` 파일의 내용을 적용하세요.

#### 관리자 권한 설정

관리자 권한을 부여하려면 Firebase Admin SDK를 사용하여 Custom Claims를 설정해야 합니다:

```javascript
// 예시: Node.js 스크립트
const admin = require('firebase-admin');
admin.initializeApp();

// 특정 사용자에게 admin 권한 부여
await admin.auth().setCustomUserClaims('USER_UID', { role: 'admin' });
```

### 4. 개발 서버 실행

```bash
npm run dev
```

### 5. 빌드

```bash
npm run build
```

### 6. Cloud Functions (자동 답변)

자동 답변 초안을 생성하는 Cloud Functions 코드는 `functions/` 디렉터리에 위치합니다. 최초 설정 시 다음 명령으로 의존성을 설치하고 타입스크립트 빌드를 실행하세요.

```bash
npm install --prefix functions
npm run --prefix functions build
```

배포는 Firebase CLI를 통해 수행합니다.

```bash
firebase deploy --only functions
```

> Genkit 기반 답변 생성을 사용하려면 Vertex AI 접근 권한이 있는 서비스 계정과 관련 환경 변수를 함께 구성하세요. 환경 변수 설정 방법은 `functions/README.md` 참고.

## 프로젝트 구조

```
qna-ai-review/
├── src/
│   ├── auth/          # 인증 관련
│   ├── components/    # 공통 컴포넌트
│   ├── data/          # 데이터 타입 및 쿼리
│   ├── pages/         # 페이지 컴포넌트
│   ├── App.tsx        # 메인 앱 컴포넌트
│   ├── firebase.ts    # Firebase 초기화
│   └── main.tsx       # 앱 진입점
├── firebase.json      # Firebase 설정
├── firestore.rules    # Firestore 보안 규칙
└── package.json
```

## 주요 기능

### 질문 관리
- 질문 작성 (제목, 내용, 태그)
- 질문 목록 조회 (실시간 업데이트)
- 질문 상세 보기

### 답변 관리
- 답변 작성
- 답변 목록 조회 (실시간 업데이트)
- 관리자가 공식 답변 지정

### 관리자 기능
- 질문 상태 변경 (열림/해결됨/잠김)
- 질문 삭제
- 공식 답변 지정

## 참고 사항

- 이메일 인증이 활성화되어 있어야 합니다.
- Firestore 보안 규칙을 반드시 적용하세요.
- 관리자 권한은 Custom Claims를 통해 설정됩니다.
