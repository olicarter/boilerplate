import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { request, authApi, type User, type Organisation, type Membership } from './api';
import { organisationsCollection, membershipsCollection } from './collections';
import { UserContext } from './context';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { NotificationBell } from './components/NotificationBell';
import { ProposalsPage } from './pages/ProposalsPage';
import { ProposalDetailPage } from './pages/ProposalDetailPage';
import { DelegationsPage } from './pages/DelegationsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { MembersPage } from './pages/MembersPage';
import { OrgListPage } from './pages/OrgListPage';
import { OrgHomePage } from './pages/OrgHomePage';
import { JoinPage } from './pages/JoinPage';
import { AdminPage } from './pages/AdminPage';
import { PublicResultsPage } from './pages/PublicResultsPage';
import { OrgProvider } from './OrgContext';

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

function NavLinks({ user, orgSlug, orgId, onClose }: { user: User | null; orgSlug?: string; orgId?: string; onClose?: () => void }) {
  const { data: allMemberships } = useLiveQuery(membershipsCollection);
  const isAdmin = user && orgId
    ? (allMemberships ?? []).some((m: Membership) => m.organisation_id === orgId && m.user_id === user.id && m.role === 'admin')
    : false;

  return (
    <div style={{ flex: 1 }}>
      {orgSlug ? (
        <>
          <Link
            to="/orgs/$slug/proposals"
            params={{ slug: orgSlug }}
            style={linkStyle}
            activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
            onClick={onClose}
          >
            Proposals
          </Link>
          <Link
            to="/orgs/$slug/delegations"
            params={{ slug: orgSlug }}
            style={linkStyle}
            activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
            onClick={onClose}
          >
            Delegations
          </Link>
          <Link
            to="/orgs/$slug/members"
            params={{ slug: orgSlug }}
            style={linkStyle}
            activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
            onClick={onClose}
          >
            Members
          </Link>
          {isAdmin && (
            <Link
              to="/orgs/$slug/admin"
              params={{ slug: orgSlug }}
              style={linkStyle}
              activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
              onClick={onClose}
            >
              Admin
            </Link>
          )}
        </>
      ) : (
        <Link
          to="/"
          style={linkStyle}
          activeProps={{ style: { ...linkStyle, background: '#e8e8e8', fontWeight: 600 } }}
          onClick={onClose}
        >
          Organisations
        </Link>
      )}
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

function Shell({ user, onLogout, orgSlug, orgId, children, notificationOrgSlug }: {
  user: User | null;
  onLogout: () => void;
  orgSlug?: string;
  orgId?: string;
  notificationOrgSlug?: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const userSection = (
    <div style={{ padding: '0 1.25rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
      {user ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            {orgSlug ? (
              <Link
                to="/orgs/$slug/users/$id"
                params={{ slug: orgSlug, id: user.id }}
                style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}
              >
                {user.name}
              </Link>
            ) : (
              <span style={{ fontSize: 13, color: '#555' }}>{user.name}</span>
            )}
            <NotificationBell orgSlug={notificationOrgSlug ?? orgSlug} />
          </div>
          <button onClick={onLogout} style={{ fontSize: 13 }}>Sign out</button>
        </>
      ) : (
        <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Not signed in</p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', borderBottom: '1px solid #ddd',
          background: '#f8f8f8', flexShrink: 0,
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
              <NavLinks user={user} orgSlug={orgSlug} orgId={orgId} onClose={() => setSidebarOpen(false)} />
              {userSection}
            </div>
          </>
        )}

        <main style={{ flex: 1, padding: '1.25rem 1rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <nav style={{
        width: 220, flexShrink: 0, borderRight: '1px solid #ddd',
        background: '#f8f8f8', display: 'flex', flexDirection: 'column', padding: '1.5rem 0',
      }}>
        <h1 style={{ margin: '0 0 1.5rem', padding: '0 1.25rem', fontSize: '1.25rem' }}>Ripple</h1>
        <NavLinks user={user} orgSlug={orgSlug} orgId={orgId} />
        {userSection}
      </nav>
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

// Root layout — no org context yet (used for / and /settings and /users/:id)
function RootComponent() {
  const [user, setUser] = useState<User | null>(getStoredUser);

  async function handleLogin(u: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  if (!user) {
    return (
      <UserContext.Provider value={null}>
        <AuthPanel onLogin={handleLogin} />
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <Shell user={user} onLogout={handleLogout}>
        <Outlet />
      </Shell>
    </UserContext.Provider>
  );
}

// Org layout — resolves org from slug, wraps with OrgProvider
function OrgLayout() {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const { slug } = useParams({ from: '/orgs/$slug' });
  const { data: allOrgs } = useLiveQuery(organisationsCollection);
  const org = (allOrgs ?? []).find((o) => (o as Organisation).slug === slug) as Organisation | undefined ?? null;
  const isLoading = !allOrgs;

  async function handleLogin(u: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  // Auth gate — org routes require authentication
  if (!user) {
    return (
      <UserContext.Provider value={null}>
        <AuthPanel onLogin={handleLogin} />
      </UserContext.Provider>
    );
  }

  if (isLoading) {
    return (
      <UserContext.Provider value={user}>
        <Shell user={user} onLogout={handleLogout} orgSlug={slug}>
          <p style={{ color: '#aaa', fontSize: 14 }}>Loading…</p>
        </Shell>
      </UserContext.Provider>
    );
  }

  if (!org) {
    return (
      <UserContext.Provider value={user}>
        <Shell user={user} onLogout={handleLogout}>
          <p style={{ fontSize: 14, color: '#d94040' }}>Organisation "{slug}" not found.</p>
        </Shell>
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <OrgProvider org={org}>
        <Shell user={user} onLogout={handleLogout} orgSlug={slug} orgId={org.id}>
          <Outlet />
        </Shell>
      </OrgProvider>
    </UserContext.Provider>
  );
}

// Routes
const rootRoute = createRootRoute();

const globalLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'global',
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => globalLayout,
  path: '/',
  component: OrgListPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => globalLayout,
  path: '/settings',
  component: SettingsPage,
});

const joinRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/join',
  component: JoinPage,
});

const orgLayout = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orgs/$slug',
  component: OrgLayout,
});

const orgIndexRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/',
  component: OrgHomePage,
});

const proposalsRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/proposals',
  component: ProposalsPage,
});

const proposalDetailRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/proposals/$id',
  component: ProposalDetailPage,
});

const delegationsRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/delegations',
  component: DelegationsPage,
});

const membersRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/members',
  component: MembersPage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/users/$id',
  component: UserProfilePage,
});

const adminRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/admin',
  component: AdminPage,
});

const publicResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orgs/$slug/results',
  component: PublicResultsPage,
});

const routeTree = rootRoute.addChildren([
  globalLayout.addChildren([indexRoute, settingsRoute]),
  orgLayout.addChildren([orgIndexRoute, proposalsRoute, proposalDetailRoute, delegationsRoute, membersRoute, userProfileRoute, joinRoute, adminRoute]),
  publicResultsRoute,
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
        <OfflineBanner />
      </ToastProvider>
    </ErrorBoundary>
  );
}
