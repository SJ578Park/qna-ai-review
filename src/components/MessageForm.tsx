import { useEffect, useState } from 'react';
import { addMessage, updateMessage } from '../data/queries';
import { useAuth } from '../auth/useAuth';
import type { MessageKind } from '../data/types';

interface MessageFormProps {
  questionId: string;
  kind?: MessageKind;
  inReplyTo?: string | null;
  onMessageAdded?: () => void;
  placeholder?: string;
  submitLabel?: string;
  initialContent?: string;
  existingMessageId?: string | null;
}

export function MessageForm({ 
  questionId, 
  kind = 'answer',
  inReplyTo = null,
  onMessageAdded,
  placeholder = '메시지를 입력해주세요...',
  submitLabel = '전송',
  initialContent = '',
  existingMessageId = null,
}: MessageFormProps) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = useAuth();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, existingMessageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 답변 작성은 관리자만 가능
    if (kind === 'answer' && role !== 'admin') {
      setError('답변 작성 권한이 없습니다.');
      return;
    }

    if (!content.trim()) {
      setError('메시지 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (existingMessageId) {
        await updateMessage(questionId, existingMessageId, content.trim());
      } else {
        const messageStatus = kind === 'question' ? 'approved' : (role === 'admin' ? 'approved' : 'draft');
        await addMessage(questionId, {
          content: content.trim(),
          role: role === 'admin' ? 'admin' : 'user',
          kind,
          status: messageStatus,
          inReplyTo,
          // turn은 addMessage에서 자동 계산됨
        });
      }
      setContent(existingMessageId ? content.trim() : '');
      onMessageAdded?.();
    } catch (err: any) {
      setError(err.message || '메시지 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
        메시지를 작성하려면 로그인이 필요합니다.
      </div>
    );
  }

  // 답변 작성은 관리자만 가능 (추가 안전 장치)
  if (kind === 'answer' && role !== 'admin') {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <h3>
        {kind === 'question'
          ? '후속 질문 작성'
          : kind === 'answer'
          ? existingMessageId
            ? '답변 수정'
            : '답변 작성'
          : '메모 작성'}
      </h3>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
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
      {role !== 'admin' && (
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
          ⓘ 작성한 질문은 바로 공유되며, 답변은 관리자 검토 후 공개됩니다.
        </div>
      )}
      {role === 'admin' && kind === 'answer' && (
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
          ⓘ 등록 즉시 사용자에게 공개됩니다. AI 초안은 관리자 패널에서 승인하거나 수정할 수 있습니다.
        </div>
      )}
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
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '작성 중...' : submitLabel}
      </button>
    </form>
  );
}
