# Cloud Functions for Automatic Answer Drafts

이 디렉터리는 질문이 등록되면 자동으로 AI 초안 답변을 생성하는 Firebase Functions 코드를 포함합니다.

## 구조

```
functions/
├─ src/
│  ├─ index.ts                # 엔트리 포인트
│  ├─ ai/draftAnswer.ts       # AI 초안 생성 로직(Genkit + Fallback)
│  └─ triggers/autoResponder.ts  # Firestore 트리거 정의
├─ genkit.config.ts           # Genkit 플러그인 구성
├─ tsconfig.json              # TypeScript 설정
├─ package.json               # Cloud Functions 의존성
└─ README.md
```

## 사용 방법

1. **의존성 설치**
   ```bash
   npm install --prefix functions
   ```

2. **TypeScript 빌드**
   ```bash
   npm run --prefix functions build
   ```

3. **로컬 테스트(에뮬레이터)**
   ```bash
   npm run --prefix functions start
   ```

4. **배포**
   ```bash
   firebase deploy --only functions
   ```

## 환경 변수 / 구성

- `GENKIT_MODEL` (선택): Vertex AI에서 사용할 모델명. 기본값은 `gemini-1.5-pro-latest` 입니다.
- `VERTEX_LOCATION` (선택): Vertex AI 리전. 기본값은 `us-central1`.
- `GENKIT_DISABLE` = `true` 로 설정하면 Genkit 호출을 비활성화하고 템플릿 기반 초안만 생성합니다.

> Genkit을 사용하려면 서비스 계정 키 또는 Workload Identity를 통해 Vertex AI 접근 권한을 부여해야 합니다. Firebase Functions에 배포할 경우, 해당 프로젝트에서 Vertex AI API를 활성화하고 Cloud Functions 서비스 계정에 필요한 권한을 추가하세요.

## 동작 개요

- `questions/{qid}/messages/{mid}` 경로에 **사용자 질문**(kind=`question`, status=`approved`)이 추가되면 트리거됩니다.
- 질문이 잠겨 있거나 이미 초안/공식 답변이 있는 경우 자동 응답을 건너뜁니다.
- 최근 메시지 맥락을 수집한 뒤 Genkit(가능한 경우) 또는 템플릿 로직으로 초안 답변을 생성하여 `messages` 서브컬렉션에 `role: 'ai'`, `status: 'draft'` 문서를 기록합니다.
- 질문 문서의 `hasDraftAnswer`, `pendingAnswerSource`, `status`(→`pending`) 필드를 업데이트하여 프론트엔드에서 "답변 준비 중" 상태를 표시할 수 있도록 합니다.

## 참고

- 초안은 관리자 검토 후 `status: 'approved'`로 승격해야 사용자에게 노출됩니다.
- 답변 생성 흐름 수정 시 `src/ai/draftAnswer.ts`의 `generateDraftAnswer` 함수를 업데이트하세요.
