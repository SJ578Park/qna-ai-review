import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getQuestion, subscribeAnswers, markOfficial, deleteAnswer } from '../data/queries';
import { AnswerItem } from '../components/AnswerItem';
import { AskAnswerForm } from '../components/AskAnswerForm';
import { useAuth } from '../auth/useAuth';
import type { Question, Answer } from '../data/types';

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const loadQuestion = async () => {
      try {
        const q = await getQuestion(id);
        setQuestion(q);
        setLoading(false);
      } catch (error) {
        console.error('Error loading question:', error);
        setLoading(false);
      }
    };

    loadQuestion();

    const unsubscribe = subscribeAnswers(id, (as) => {
      setAnswers(as);
    });

    return () => unsubscribe();
  }, [id]);

  const handleMarkOfficial = async (aid: string) => {
    if (!id || !window.confirm('이 답변을 공식 답변으로 지정하시겠습니까?')) return;
    
    try {
      await markOfficial(id, aid);
    } catch (error) {
      console.error('Error marking official:', error);
      alert('공식 답변 지정에 실패했습니다.');
    }
  };

  const handleDeleteAnswer = async (aid: string) => {
    if (!id || !window.confirm('이 답변을 삭제하시겠습니까?')) return;
    
    try {
      await deleteAnswer(id, aid);
    } catch (error) {
      console.error('Error deleting answer:', error);
      alert('답변 삭제에 실패했습니다.');
    }
  };

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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  }

  if (!question) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>질문을 찾을 수 없습니다.</p>
        <Link to="/">목록으로 돌아가기</Link>
      </div>
    );
  }

  const canEdit = role === 'admin' || (user && user.uid === question.authorUid);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Link to="/" style={{ color: '#007bff', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
        ← 목록으로
      </Link>

      <div style={{ borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>{question.title}</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {question.authorName || '익명'} • {formatDate(question.createdAt)}
          </span>
          {question.status === 'answered' && <span style={{ color: 'green' }}>✅ 해결됨</span>}
          {question.status === 'locked' && <span style={{ color: 'red' }}>🔒 잠김</span>}
        </div>

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

        <div style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{question.body}</div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>
          답변 {answers.length > 0 && `(${answers.length})`}
        </h2>

        {answers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            아직 답변이 없습니다.
          </div>
        ) : (
          <div>
            {answers.map((answer) => (
              <div key={answer.id} style={{ position: 'relative' }}>
                <AnswerItem
                  answer={answer}
                  questionId={id!}
                  isOfficial={answer.id === question.officialAnswerId || answer.isOfficial}
                  onDelete={() => handleDeleteAnswer(answer.id)}
                />
                {role === 'admin' && !answer.isOfficial && question.status !== 'answered' && (
                  <button
                    onClick={() => handleMarkOfficial(answer.id)}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '4rem',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    공식 답변 지정
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {question.status !== 'locked' && <AskAnswerForm questionId={id!} />}
      </div>
    </div>
  );
}

