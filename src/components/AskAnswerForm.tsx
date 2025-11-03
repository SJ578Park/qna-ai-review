import { useState } from 'react';
import { addAnswer } from '../data/queries';
import { useAuth } from '../auth/useAuth';

interface AskAnswerFormProps {
  questionId: string;
  onAnswerAdded?: () => void;
}

export function AskAnswerForm({ questionId, onAnswerAdded }: AskAnswerFormProps) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!body.trim()) {
      setError('답변 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addAnswer(questionId, body);
      setBody('');
      if (onAnswerAdded) {
        onAnswerAdded();
      }
    } catch (err: any) {
      setError(err.message || '답변 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
        답변을 작성하려면 로그인이 필요합니다.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <h3>답변 작성</h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="답변을 입력해주세요..."
        required
        rows={6}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '1rem',
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
      {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
        }}
      >
        {loading ? '작성 중...' : '답변 등록'}
      </button>
    </form>
  );
}

