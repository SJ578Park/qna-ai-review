import { useState, useEffect } from 'react';
import { User, getIdTokenResult } from 'firebase/auth';
import { auth, onAuth } from '../firebase';

export type Role = 'guest' | 'admin';

export interface AuthUser {
  user: User | null;
  role: Role | null;
  loading: boolean;
}

export function useAuth(): AuthUser {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuth(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Custom Claims에서 role 가져오기
          const tokenResult = await getIdTokenResult(firebaseUser, true);
          const userRole = tokenResult.claims.role as Role | undefined;
          setRole(userRole || 'guest');
        } catch (error) {
          console.error('Error getting user role:', error);
          setRole('guest');
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
}

export function useIsAdmin(): boolean {
  const { role } = useAuth();
  return role === 'admin';
}

