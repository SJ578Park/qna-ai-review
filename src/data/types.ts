import { Timestamp } from 'firebase/firestore';

export type Role = 'guest' | 'user' | 'admin';

export type MessageStatus = 'draft' | 'approved' | 'rejected' | 'superseded';
export type MessageRole = 'user' | 'admin' | 'ai';
export type MessageKind = 'question' | 'answer' | 'note';

export type Question = {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  authorUid?: string | null;
  authorName?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  status: 'open' | 'pending' | 'answered' | 'locked';
  officialAnswerId?: string | null;
  lastMessageAt?: Timestamp | null;
  visibility?: 'public' | 'private';
  hasDraftAnswer?: boolean;
  pendingAnswerSource?: MessageRole | null;
  pendingAnswerUpdatedAt?: Timestamp | null;
};

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  kind: MessageKind;
  status: MessageStatus;
  aiGenerated?: boolean;
  sources?: Array<{ docId?: string; snippet?: string }>;
  riskFlags?: string[];
  inReplyTo?: string | null;
  turn: number;
  authorUid?: string | null;
  authorName?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  revision?: number;
  revisionOf?: string | null;
}

// Deprecated: Answer 타입은 이전 호환성을 위해 유지하되, 새 코드에서는 Message를 사용하세요.
export type Answer = {
  id: string;
  body: string;
  authorUid?: string | null;
  authorName?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isOfficial?: boolean;
};

export type UserProfile = {
  id: string;
  displayName: string;
  role: Role;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Guide = {
  id: string;
  title: string;
  body: string;
  audience: 'guest' | 'admin';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};
