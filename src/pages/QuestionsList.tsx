import { useEffect, useState } from 'react';
import { subscribeQuestions } from '../data/queries';
import { QuestionCard } from '../components/QuestionCard';
import { Link } from 'react-router-dom';
import type { Question } from '../data/types';

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeQuestions((qs) => {
      setQuestions(qs);
      setLoading(false);
    }, { top: 50 });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>질문 목록</h1>
        <Link
          to="/ask"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          질문하기
        </Link>
      </div>

      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          아직 질문이 없습니다. 첫 번째 질문을 작성해보세요!
        </div>
      ) : (
        <div>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}

