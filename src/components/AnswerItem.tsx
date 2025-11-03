import type { Answer } from '../data/types';
import { useAuth } from '../auth/useAuth';

interface AnswerItemProps {
  answer: Answer;
  questionId: string;
  isOfficial?: boolean;
  onDelete?: () => void;
}

export function AnswerItem({ answer, questionId, isOfficial, onDelete }: AnswerItemProps) {
  const { user, role } = useAuth();

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

  const canDelete = role === 'admin' || (user && user.uid === answer.authorUid);

  return (
    <div style={{
      border: isOfficial ? '2px solid #4CAF50' : '1px solid #ddd',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      backgroundColor: isOfficial ? '#f1f8f4' : '#fff',
    }}>
      {isOfficial && (
        <div style={{
          background: '#4CAF50',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          display: 'inline-block',
          fontSize: '0.8rem',
          marginBottom: '0.5rem',
        }}>
          ✓ 공식 답변
        </div>
      )}
      
      <p style={{ margin: '0.5rem 0', whiteSpace: 'pre-wrap' }}>{answer.body}</p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#999' }}>
          <span>{answer.authorName || '익명'}</span>
          <span style={{ margin: '0 0.5rem' }}>•</span>
          <span>{formatDate(answer.createdAt)}</span>
        </div>
        
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            style={{
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

