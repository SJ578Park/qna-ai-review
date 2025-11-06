import type { Message } from '../data/types';
import { useAuth } from '../auth/useAuth';

interface MessageItemProps {
  message: Message;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onApprove?: () => void;
  onUseDraft?: () => void;
  showAdminControls?: boolean;
}

export function MessageItem({ 
  message, 
  onDelete, 
  onEdit, 
  onApprove, 
  onUseDraft,
  showAdminControls 
}: MessageItemProps) {
  const { role, content, status, authorName, createdAt, aiGenerated } = message;
  const isDraft = status === 'draft';
  const isAiDraft = isDraft && role === 'ai';
  const { role: userRole } = useAuth();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 역할별 색상: 사용자 파랑, 관리자 회색, AI 초록
  const borderColor = role === 'ai' ? '#28a745' : role === 'admin' ? '#6c757d' : '#007bff';

  return (
    <div style={{ 
      borderLeft: `4px solid ${borderColor}`, 
      padding: '0.5rem 1rem', 
      marginBottom: '1rem', 
      background: isDraft ? '#fff5e6' : '#fff',
      borderRadius: '4px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{role === 'ai' ? 'AI' : authorName || '익명'}</strong>
          {aiGenerated && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#28a745' }}>
              (AI 초안)
            </span>
          )}
          {isDraft && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#fd7e14' }}>
              (초안)
            </span>
          )}
          {status === 'approved' && role === 'admin' && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#4CAF50' }}>
              ✓ 공식 답변
            </span>
          )}
        </div>
        <small style={{ color: '#999' }}>{formatDate(createdAt)}</small>
      </div>
      <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{content}</p>

      {/* 관리자 컨트롤 */}
      {showAdminControls && userRole === 'admin' && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          {isAiDraft ? (
            <>
              {onApprove && (
                <button
                  onClick={onApprove}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  초안 승인
                </button>
              )}
              {onUseDraft && (
                <button
                  onClick={onUseDraft}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  초안 기반 새 답변
                </button>
              )}
            </>
          ) : (
            <>
              {onEdit && (
                <button
                  onClick={() => onEdit(content)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  수정
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}




