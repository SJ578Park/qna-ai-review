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
        {question.status === 'answered' && <span style={{ color: 'green' }}>✅</span>}
        {question.status === 'locked' && <span style={{ color: 'red' }}>🔒</span>}
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

