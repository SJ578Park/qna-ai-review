import { Timestamp } from 'firebase/firestore';

export type Role = 'guest' | 'admin';

export type Question = {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  authorUid?: string | null;
  authorName?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  status: 'open' | 'answered' | 'locked';
  officialAnswerId?: string | null;
  visibility?: 'public' | 'private';
};

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

