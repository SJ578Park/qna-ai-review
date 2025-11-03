import { useEffect, useState } from 'react';
import { subscribeQuestions, updateQuestion, deleteQuestion } from '../data/queries';
import { AdminGate } from '../auth/AdminGate';
import { QuestionCard } from '../components/QuestionCard';
import type { Question } from '../data/types';

export default function AdminPanel() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<Question['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeQuestions((qs) => {
      setQuestions(qs);
      setLoading(false);
    }, { top: 100 });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (qid: string, status: Question['status']) => {
    try {
      await updateQuestion(qid, { status });
    } catch (error) {
      console.error('Error updating question:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (qid: string) => {
    if (!window.confirm('이 질문을 삭제하시겠습니까?')) return;
    
    try {
      await deleteQuestion(qid);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('질문 삭제에 실패했습니다.');
    }
  };

  const filteredQuestions = filter === 'all' 
    ? questions 
    : questions.filter((q) => q.status === filter);

  return (
    <AdminGate>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1>관리자 패널</h1>

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>필터:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Question['status'] | 'all')}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
          >
            <option value="all">전체</option>
            <option value="open">열림</option>
            <option value="answered">해결됨</option>
            <option value="locked">잠김</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>로딩 중...</div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
            질문이 없습니다.
          </div>
        ) : (
          <div>
            {filteredQuestions.map((q) => (
              <div key={q.id} style={{ position: 'relative', marginBottom: '1rem' }}>
                <QuestionCard question={q} />
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexDirection: 'column',
                }}>
                  <select
                    value={q.status}
                    onChange={(e) => handleUpdateStatus(q.id, e.target.value as Question['status'])}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="open">열림</option>
                    <option value="answered">해결됨</option>
                    <option value="locked">잠김</option>
                  </select>
                  <button
                    onClick={() => handleDelete(q.id)}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGate>
  );
}

