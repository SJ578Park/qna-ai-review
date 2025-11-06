import { Link } from 'react-router-dom';
import type { Question } from '../data/types';

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const statusBadge = (() => {
    switch (question.status) {
      case 'open':
        return { text: '답변 대기', color: '#0d6efd', background: '#e7f1ff' };
      case 'pending':
        return { text: '검토 중', color: '#ff8c00', background: '#fff3cd' };
      case 'answered':
        return { text: '해결됨', color: '#198754', background: '#d1f2e0' };
      case 'locked':
        return { text: '잠김', color: '#dc3545', background: '#f8d7da' };
      default:
        return null;
    }
  })();

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '1rem', 
      marginBottom: '1rem',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
        <Link to={`/q/${question.id}`} style={{ textDecoration: 'none', color: '#333', flex: 1 }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{question.title}</h3>
        </Link>
        {statusBadge && (
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: statusBadge.color,
              background: statusBadge.background,
              whiteSpace: 'nowrap',
            }}
          >
            {statusBadge.text}
          </span>
        )}
      </div>
      
      <p style={{ color: '#666', margin: '0.5rem 0', fontSize: '0.9rem' }}>
        {question.body.substring(0, 150)}{question.body.length > 150 ? '...' : ''}
      </p>
      
      {question.tags && question.tags.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {question.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                background: '#f0f0f0',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginRight: '0.5rem',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#999' }}>
        <span>{question.authorName || '익명'}</span>
        <span style={{ margin: '0 0.5rem' }}>•</span>
        <span>{formatDate(question.createdAt)}</span>
      </div>
    </div>
  );
}
