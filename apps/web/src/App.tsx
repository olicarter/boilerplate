import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { request, authApi, type User } from './api';
import { UserContext } from './context';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProposalsPage } from './pages/ProposalsPage';
import { ProposalDetailPage } from './pages/ProposalDetailPage';
import { DelegationsPage } from './pages/DelegationsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';

const STORAGE_KEY = 'ripple_user';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function AuthPanel({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const options = await request<never>('/auth/login/begin', { method: 'POST' });
      const credential = await startAuthentication({ optionsJSON: options });
      const user = await request<User>('/auth/login/finish', {
        method: 'POST',
        body: JSON.stringify(credential),
      });
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const options = await request<never>('/auth/register/begin', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const credential = await startRegistration({ optionsJSON: options });
      const user = await request<User>('/auth/register/finish', {
        method: 'POST',
        body: JSON.stringify(credential),
      });
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>

      {mode === 'login' ? (
        <>
          <button onClick={handleLogin} disabled={loading} style={{ padding: '0.5rem 1.5rem', width: '100%', marginBottom: '1rem' }}>
            {loading ? 'Waiting for passkey…' : 'Sign in with passkey'}
          </button>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            No account?{' '}
            <button onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', padding: 0 }}>
              Register
            </button>
          </p>
        </>
      ) : (
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="reg-name" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Name</label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="reg-email" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', fontSize: 14 }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1.5rem', width: '100%', marginBottom: '1rem' }}>
            {loading ? 'Waiting for passkey…' : 'Create passkey'}
          </button>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            Already have an account?{' '}
            <button onClick={() => { setMode('login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', padding: 0 }}>
              Sign in
            </button>
          </p>
        </form>
      )}

      {error && <p style={{ color: 'red', marginTop: '1rem', marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '0.5rem 1.25rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 400,
  textDecoration: 'none',
  color: 'inherit',
  boxSizing: 'border-box',
};

function NavLinks({ user, onClose }: { user: User | null; onClose?: () => void }) {
  return (
    <div style={{ flex: 1 }}>
      <Link
        to="/proposals"
        style={linkStyle}
        activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
        onClick={onClose}
      >
        Proposals
      </Link>
      <Link
        to="/delegations"
        style={linkStyle}
        activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
        onClick={onClose}
      >
        Delegations
      </Link>
      {user && (
        <Link
          to="/settings"
          style={linkStyle}
          activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
          onClick={onClose}
        >
          Settings
        </Link>
      )}
    </div>
  );
}

function RootComponent() {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  async function handleLogin(u: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  const userSection = (
    <div style={{ padding: '0 1.25rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
      {user ? (
        <>
          <Link
            to="/users/$id"
            params={{ id: user.id }}
            style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: '0.5rem', textDecoration: 'none' }}
          >
            {user.name}
          </Link>
          <button onClick={handleLogout} style={{ fontSize: 13 }}>Sign out</button>
        </>
      ) : (
        <AuthPanel onLogin={handleLogin} />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <UserContext.Provider value={user}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {/* Mobile top bar */}
          <header style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #ddd',
            background: '#f8f8f8',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0.25rem', color: '#333' }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Ripple</span>
          </header>

          {/* Slide-in overlay */}
          {sidebarOpen && (
            <>
              <div
                onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10 }}
              />
              <div style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
                zIndex: 11, background: '#f8f8f8',
                boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', padding: '1.5rem 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', marginBottom: '1.5rem' }}>
                  <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Ripple</h1>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close menu"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#555' }}
                  >
                    ✕
                  </button>
                </div>
                <NavLinks user={user} onClose={() => setSidebarOpen(false)} />
                {userSection}
              </div>
            </>
          )}

          <main style={{ flex: 1, padding: '1.25rem 1rem', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </UserContext.Provider>
    );
  }

  // Desktop layout — sidebar always visible
  return (
    <UserContext.Provider value={user}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <nav style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid #ddd',
          background: '#f8f8f8',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
        }}>
          <h1 style={{ margin: '0 0 1.5rem', padding: '0 1.25rem', fontSize: '1.25rem' }}>Ripple</h1>
          <NavLinks user={user} />
          {userSection}
        </nav>
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </UserContext.Provider>
  );
}

const rootRoute = createRootRoute({ component: RootComponent });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/proposals' }); },
});

const proposalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/proposals',
  component: ProposalsPage,
});

const proposalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/proposals/$id',
  component: ProposalDetailPage,
});

const delegationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/delegations',
  component: DelegationsPage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$id',
  component: UserProfilePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  proposalsRoute,
  proposalDetailRoute,
  delegationsRoute,
  userProfileRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
