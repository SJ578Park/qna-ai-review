import { ReactNode } from 'react';
import { useIsAdmin } from './useAuth';

interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGate({ children, fallback = <div>관리자 권한이 필요합니다.</div> }: AdminGateProps) {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

