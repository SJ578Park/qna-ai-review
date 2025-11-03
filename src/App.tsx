import { Outlet, Link } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { LoginForm } from './auth/LoginForm';
import { logout } from './firebase';

function App() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>로딩 중...</div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #ddd',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <Link to="/" style={{ textDecoration: 'none', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Q&A AI Review
          </Link>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ color: '#666' }}>{user.email || user.displayName || '사용자'}</span>
              <Link to="/admin" style={{ color: '#007bff', textDecoration: 'none' }}>관리자</Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <span style={{ color: '#666' }}>로그인 필요</span>
          )}
        </nav>
      </header>

      <main>
        {!user ? (
          <LoginForm />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

export default App;

