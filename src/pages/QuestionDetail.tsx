import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subscribeQuestion, subscribeAllMessages, subscribeUserVisibleMessages, deleteMessage, approveMessage } from '../data/queries';
import { MessageItem } from '../components/MessageItem';
import { MessageForm } from '../components/MessageForm';
import { useAuth } from '../auth/useAuth';
import type { Question, Message } from '../data/types';

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const [answerInitialContent, setAnswerInitialContent] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [answerFormVersion, setAnswerFormVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setQuestion(null);

    const unsubscribe = subscribeQuestion(id, (q) => {
      setQuestion(q);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let unsubscribe: (() => void) | undefined;

    if (role === 'admin') {
      unsubscribe = subscribeAllMessages(id, (msgs) => {
        setMessages(msgs);
      });
    } else {
      unsubscribe = subscribeUserVisibleMessages(id, user?.uid || null, (msgs) => {
        setMessages(msgs);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, role, user?.uid]);

  const resetAnswerForm = () => {
    setAnswerInitialContent('');
    setEditingMessageId(null);
    setAnswerFormVersion((v) => v + 1);
  };

  const handleUseDraftForAnswer = (message: Message) => {
    setAnswerInitialContent(message.content);
    setEditingMessageId(null);
    setAnswerFormVersion((v) => v + 1);
  };

  const handleEditAnswer = (message: Message) => {
    setAnswerInitialContent(message.content);
    setEditingMessageId(message.id);
    setAnswerFormVersion((v) => v + 1);
  };

  const handleApproveMessage = async (mid: string) => {
    if (!id || !window.confirm('이 메시지를 승인하시겠습니까?')) return;
    
    try {
      await approveMessage(id, mid);
      if (editingMessageId === mid) {
        resetAnswerForm();
      }
    } catch (error) {
      console.error('Error approving message:', error);
      alert('메시지 승인에 실패했습니다.');
    }
  };

  const handleDeleteMessage = async (mid: string) => {
    if (!id || !window.confirm('이 메시지를 삭제하시겠습니까?')) return;
    
    try {
      await deleteMessage(id, mid);
      if (editingMessageId === mid) {
        resetAnswerForm();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('메시지 삭제에 실패했습니다.');
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

  const hasPendingAnswer = Boolean(question.hasDraftAnswer);
  const pendingSource = question.pendingAnswerSource;
  const pendingUpdatedAtLabel = question.pendingAnswerUpdatedAt
    ? formatDate(question.pendingAnswerUpdatedAt)
    : null;
  const pendingMessage =
    pendingSource === 'ai'
      ? 'AI가 답변 초안을 작성했고, 관리자 검토 후 공개될 예정입니다.'
      : '관리자가 답변을 검토 또는 작성 중입니다.';

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
          {question.status === 'open' && (
            <span style={{ color: '#007bff' }}>• 답변 대기 중</span>
          )}
          {question.status === 'pending' && (
            <span style={{ color: '#ff9800' }}>⏳ 답변 준비 중</span>
          )}
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
          대화 {messages.length > 0 && `(${messages.length})`}
        </h2>

        {hasPendingAnswer && role !== 'admin' && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: '#fff8e1',
              border: '1px solid #ffe0a3',
              borderRadius: '6px',
              color: '#8a6d3b',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>답변 준비 중</strong>
            <span>{pendingMessage}</span>
            {pendingUpdatedAtLabel && (
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#a98231' }}>
                마지막 업데이트: {pendingUpdatedAtLabel}
              </div>
            )}
          </div>
        )}

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            {hasPendingAnswer ? '관리자가 답변을 준비 중입니다. 곧 답변을 확인하실 수 있어요.' : '아직 메시지가 없습니다.'}
          </div>
        ) : (
          <div>
            {messages.map((message) => {
              const isAiDraft = message.role === 'ai' && message.status === 'draft';
              const canApprove = role === 'admin' && isAiDraft;
              const canEdit = role === 'admin' && message.role === 'admin';
              const canDelete = role === 'admin' && message.role !== 'ai';

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  showAdminControls={role === 'admin'}
                  onDelete={canDelete ? () => handleDeleteMessage(message.id) : undefined}
                  onApprove={canApprove ? () => handleApproveMessage(message.id) : undefined}
                  onUseDraft={canApprove ? () => handleUseDraftForAnswer(message) : undefined}
                  onEdit={canEdit ? () => handleEditAnswer(message) : undefined}
                />
              );
            })}
          </div>
        )}

        {question.status !== 'locked' && (
          <div>
            {/* 답변 작성은 관리자만 가능 (일반 사용자는 볼 수 없음) */}
            {role === 'admin' && (
              <div>
                {(answerInitialContent || editingMessageId) && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                    {editingMessageId
                      ? '공식 답변을 수정 중입니다.'
                      : 'AI 초안을 참고해 새로운 답변을 작성하세요.'}
                    <button
                      type="button"
                      onClick={resetAnswerForm}
                      style={{
                        marginLeft: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#007bff',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '0.8rem',
                      }}
                    >
                      취소
                    </button>
                  </div>
                )}
                <MessageForm 
                  key={answerFormVersion}
                  questionId={id!} 
                  kind="answer"
                  submitLabel={editingMessageId ? '답변 수정 저장' : '답변 게시'}
                  initialContent={answerInitialContent}
                  existingMessageId={editingMessageId}
                  placeholder={
                    editingMessageId
                      ? '답변 내용을 수정하세요.'
                      : answerInitialContent
                      ? 'AI 초안을 참고하여 최종 답변을 작성하세요.'
                      : '사용자에게 안내할 답변을 작성하세요.'
                  }
                  onMessageAdded={() => {
                    resetAnswerForm();
                  }}
                />
              </div>
            )}
            {/* 후속 질문은 일반 사용자도 작성 가능 */}
            {user && role !== 'admin' && (
              <MessageForm 
                questionId={id!} 
                kind="question"
                placeholder="후속 질문을 입력해주세요..."
                submitLabel="질문 등록"
                onMessageAdded={() => {
                  // 메시지 추가 후 자동으로 새로고침되므로 별도 처리 불필요
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
