import { useState, useEffect } from 'react';
import { User, getIdTokenResult } from 'firebase/auth';
import { onAuth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export type Role = 'guest' | 'user' | 'admin';

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
          // 먼저 Custom Claims에서 role 확인 (admin의 경우)
          const tokenResult = await getIdTokenResult(firebaseUser, true);
          const claimsRole = tokenResult.claims.role as Role | undefined;
          
          if (claimsRole === 'admin') {
            // Custom Claims에 admin이 있으면 바로 사용
            setRole('admin');
          } else {
            // users collection에서 role 가져오기
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setRole((userData.role as Role) || 'user');
            } else {
              // users collection에 문서가 없으면 기본값 'user'
              setRole('user');
            }
          }
        } catch (error) {
          console.error('Error getting user role:', error);
          setRole('user'); // 기본값을 'user'로 변경
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
