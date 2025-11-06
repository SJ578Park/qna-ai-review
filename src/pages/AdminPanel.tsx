import { useEffect, useState } from 'react';
import { subscribeQuestions, updateQuestion, deleteQuestion, subscribeDraftMessages, approveMessage, updateMessage, deleteMessage } from '../data/queries';
import { AdminGate } from '../auth/AdminGate';
import { QuestionCard } from '../components/QuestionCard';
import { MessageItem } from '../components/MessageItem';
import type { Question, Message } from '../data/types';

export default function AdminPanel() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<Question['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'drafts'>('questions');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<Message[]>([]);
  const [editingMessage, setEditingMessage] = useState<{ mid: string; content: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeQuestions((qs) => {
      setQuestions(qs);
      setLoading(false);
    }, { top: 100 });

    return () => unsubscribe();
  }, []);

  // 선택된 질문의 초안 메시지 구독
  useEffect(() => {
    if (!selectedQuestionId || activeTab !== 'drafts') return;

    const unsubscribe = subscribeDraftMessages(selectedQuestionId, (msgs) => {
      setDraftMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedQuestionId, activeTab]);

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

  const handleApproveDraft = async (qid: string, mid: string, content?: string) => {
    try {
      await approveMessage(qid, mid, content);
      setEditingMessage(null);
    } catch (error) {
      console.error('Error approving message:', error);
      alert('메시지 승인에 실패했습니다.');
    }
  };

  const handleEditDraft = async (qid: string, mid: string, newContent: string) => {
    try {
      await updateMessage(qid, mid, newContent);
      setEditingMessage(null);
    } catch (error) {
      console.error('Error updating message:', error);
      alert('메시지 수정에 실패했습니다.');
    }
  };

  const handleDeleteDraft = async (qid: string, mid: string) => {
    if (!window.confirm('이 초안 메시지를 삭제하시겠습니까?')) return;
    
    try {
      await deleteMessage(qid, mid);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  const filteredQuestions = filter === 'all' 
    ? questions 
    : questions.filter((q) => q.status === filter);

  return (
    <AdminGate>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1>관리자 패널</h1>

        {/* 탭 메뉴 */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid #eee' }}>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'questions' ? '#007bff' : 'transparent',
              color: activeTab === 'questions' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'questions' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'questions' ? 'bold' : 'normal',
            }}
          >
            질문 관리
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'drafts' ? '#007bff' : 'transparent',
              color: activeTab === 'drafts' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'drafts' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'drafts' ? 'bold' : 'normal',
            }}
          >
            초안 큐
          </button>
        </div>

        {activeTab === 'questions' && (
          <div>
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
                <option value="pending">검토 중</option>
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
                        <option value="pending">검토 중</option>
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
        )}

        {activeTab === 'drafts' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 'bold', marginRight: '1rem' }}>질문 선택:</label>
              <select
                value={selectedQuestionId || ''}
                onChange={(e) => setSelectedQuestionId(e.target.value || null)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '1rem',
                  minWidth: '300px',
                }}
              >
                <option value="">전체 질문</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.id})
                  </option>
                ))}
              </select>
            </div>

            {selectedQuestionId ? (
              draftMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                  이 질문에 대한 초안 메시지가 없습니다.
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>
                    초안 메시지 ({draftMessages.length}개)
                  </h3>
                  {draftMessages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: '2rem', position: 'relative' }}>
                      <MessageItem
                        message={msg}
                        showAdminControls={true}
                        onApprove={() => {
                          if (editingMessage && editingMessage.mid === msg.id) {
                            handleApproveDraft(selectedQuestionId, msg.id, editingMessage.content);
                          } else {
                            handleApproveDraft(selectedQuestionId, msg.id);
                          }
                        }}
                        onEdit={(content) => {
                          setEditingMessage({ mid: msg.id, content });
                        }}
                        onDelete={() => handleDeleteDraft(selectedQuestionId, msg.id)}
                      />
                      {editingMessage && editingMessage.mid === msg.id && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: '#f9f9f9',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                        }}>
                          <textarea
                            value={editingMessage.content}
                            onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                            rows={6}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              fontSize: '1rem',
                              fontFamily: 'inherit',
                            }}
                          />
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleEditDraft(selectedQuestionId, msg.id, editingMessage.content)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              수정 저장
                            </button>
                            <button
                              onClick={() => handleApproveDraft(selectedQuestionId, msg.id, editingMessage.content)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              수정 후 승인
                            </button>
                            <button
                              onClick={() => setEditingMessage(null)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                질문을 선택하여 해당 질문의 초안 메시지를 확인하세요.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminGate>
  );
}
