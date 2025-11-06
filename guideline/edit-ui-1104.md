멀티턴 구조에 맞춰 React 컴포넌트를 수정해야 합니다. 주요 변경 사항은 다음과 같습니다.

3.1. 메시지 컴포넌트 추가 (MessageItem.tsx)

답변 전용 AnswerItem 대신 모든 메시지를 렌더링하는 MessageItem을 새로 만듭니다. 역할과 상태에 따라 스타일을 구분합니다.

interface MessageItemProps {
  message: Message;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onApprove?: () => void;
  showAdminControls?: boolean;
}

export function MessageItem({ message, onDelete, onEdit, onApprove, showAdminControls }: MessageItemProps) {
  const { role, content, status, authorName, createdAt, aiGenerated } = message;
  const isDraft = status === 'draft';

  // 역할별 색상: 사용자 파랑, 관리자 회색, AI 초록 등
  const borderColor = role === 'ai' ? '#28a745' : role === 'admin' ? '#6c757d' : '#007bff';

  return (
    <div style={{ borderLeft: `4px solid ${borderColor}`, padding: '0.5rem 1rem', marginBottom: '1rem', background: isDraft ? '#fff5e6' : '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{role === 'ai' ? 'AI' : authorName || '익명'}</strong>
          {aiGenerated && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#28a745' }}>(AI 초안)</span>}
          {isDraft && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#fd7e14' }}>(초안)</span>}
        </div>
        <small>{new Date(createdAt.seconds * 1000).toLocaleString('ko-KR')}</small>
      </div>
      <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{content}</p>

      {/* 관리자 컨트롤 */}
      {showAdminControls && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          {isDraft && <button onClick={onApprove}>승인</button>}
          <button onClick={() => onEdit?.(content)}>수정</button>
          <button onClick={onDelete}>삭제</button>
        </div>
      )}
    </div>
  );
}

3.2. 질문 상세 페이지 수정 (QuestionDetail.tsx)

기존 answers 관련 로직을 제거하고, subscribeApprovedMessages로 메시지를 구독합니다.

타임라인 형태로 MessageItem을 나열합니다.

사용자 입력 폼은 새 메시지 작성과 후속 질문의 두 가지 모드를 제공할 수 있습니다. 기본적으로 사용자는 자신이 질문을 올린 스레드에서 추가 질문을 남기고, 관리자는 답변을 작성할 수 있습니다.

메시지 전송 시 kind 및 inReplyTo를 지정하여 구조를 유지합니다.

3.3. 관리자 패널 수정 (AdminPanel.tsx)

draft 상태의 메시지 목록을 표시하는 초안 큐를 추가합니다. 질문별로 필터링하거나 전체 초안 목록을 탭으로 나눌 수 있습니다.

각 초안 메시지에 대해 승인, 수정 후 승인, 삭제 버튼을 제공합니다. 승인 시 approveMessage callable 함수를 호출하고, 수정된 본문을 전송하면 됩니다.

이미 승인된 메시지나 사용자 메시지에는 편집/승인 버튼을 숨깁니다.

3.4. 입력 폼 수정

답변 전용 AskAnswerForm을 일반화하여 MessageForm으로 만듭니다. role과 kind는 서버에서 부여하지만, 사용자가 후속 질문인지 답변인지 선택할 수 있게 할 수 있습니다.

에디터 영역을 하나 두고, 전송 시 addMessage를 호출하며 kind='question' (후속 질문) 또는 kind='answer' (답변)로 구분합니다.

비로그인 사용자는 질문/답변을 작성할 수 없도록 기존 로직을 유지합니다.