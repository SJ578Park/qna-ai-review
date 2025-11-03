# Firestore 보안 규칙

이 파일은 Firestore 보안 규칙의 참고 문서입니다. 실제 규칙은 Firebase Console에서 설정해야 합니다.

## 규칙 (v2)

```javascript
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

    // users 컬렉션
    match /users/{uid} {
      // 본인 읽기/쓰기 허용, 관리자 전체 읽기/쓰기 허용
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isOwner(uid) || isAdmin();
    }

    // questions 컬렉션
    match /questions/{qid} {
      allow read: if true; // 공개 Q&A

      // 생성: 로그인 유저만
      allow create: if isSignedIn();

      // 수정: 소유자(작성자) 또는 관리자
      allow update, delete: if isAdmin() || (isSignedIn() && isOwner(resource.data.authorUid));

      // answers 서브컬렉션
      match /answers/{aid} {
        allow read: if true;

        // 답변 작성: 로그인 유저 (단, 질문이 locked 상태가 아니어야 함)
        allow create: if isSignedIn() && get(/databases/$(database)/documents/questions/$(qid)).data.status != 'locked';

        // 수정/삭제: 관리자 또는 답변 소유자
        allow update, delete: if isAdmin() || (isSignedIn() && isOwner(resource.data.authorUid));
      }
    }

    // guides 컬렉션: admin만 작성/수정, 모두 읽기
    match /guides/{gid} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## 중요 사항

1. **Custom Claims 설정**: 관리자 권한은 Firebase Auth Custom Claims를 통해 설정해야 합니다.
   - 서버 측(Admin SDK)에서 `admin.auth().setCustomUserClaims(uid, { role: 'admin' })` 호출
   - 클라이언트는 토큰을 새로고침하여 변경사항 반영: `user.getIdToken(true)`

2. **인덱스 설정**: 다음 쿼리를 위해 Firestore 인덱스가 필요할 수 있습니다.
   - `questions`: `createdAt desc` (기본 인덱스로 생성됨)
   - `questions`: `status asc, createdAt desc` (필터링 쿼리용)

3. **서버 타임스탬프**: 클라이언트에서 임의로 변경할 수 없도록 `serverTimestamp()` 사용을 권장합니다.

