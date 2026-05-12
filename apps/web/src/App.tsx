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
import { LandingPage } from './pages/LandingPage';
import { OrgHomePage } from './pages/OrgHomePage';
import { JoinPage } from './pages/JoinPage';
import { AdminPage } from './pages/AdminPage';
import { PublicResultsPage } from './pages/PublicResultsPage';
import { ActivityFeedPage } from './pages/ActivityFeedPage';
import { DelegationNetworkPage } from './pages/DelegationNetworkPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { PricingPage } from './pages/PricingPage';
import { OrgProvider } from './OrgContext';
import styles from './styles/Shell.module.css';

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

function AuthPanel({ onLogin, onDismiss }: { onLogin: (user: User) => void; onDismiss?: () => void }) {
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 360,
        padding: 'var(--space-8)',
        border: 'var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-bold)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-fg)',
            marginBottom: 'var(--space-5)',
          }}>
            Ripple
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)' }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)' }}>
            {mode === 'login' ? 'Use your passkey to continue.' : 'Register with a passkey.'}
          </p>
        </div>

        {mode === 'login' ? (
          <>
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                height: 36,
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--weight-medium)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginBottom: 'var(--space-4)',
                transition: 'background var(--transition-fast)',
              }}
            >
              {loading ? 'Waiting for passkey…' : 'Sign in with passkey'}
            </button>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)', margin: 0 }}>
              No account?{' '}
              <button
                onClick={() => { setMode('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-fg)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', cursor: 'pointer', padding: 0, fontWeight: 'var(--weight-medium)', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Register
              </button>
            </p>
          </>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label htmlFor="reg-name" style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-fg-muted)' }}>Name</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', height: 32, padding: '0 var(--space-3)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--color-fg)' }}
              />
            </div>
            <div>
              <label htmlFor="reg-email" style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-fg-muted)' }}>Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', height: 32, padding: '0 var(--space-3)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--color-fg)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 36,
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--weight-medium)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginTop: 'var(--space-1)',
              }}
            >
              {loading ? 'Waiting for passkey…' : 'Create passkey'}
            </button>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)', margin: 0 }}>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-fg)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', cursor: 'pointer', padding: 0, fontWeight: 'var(--weight-medium)', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {error && (
          <p style={{ color: 'var(--color-error)', marginTop: 'var(--space-4)', marginBottom: 0, fontSize: 'var(--text-base)' }}>
            {error}
          </p>
        )}
        {onDismiss && (
          <p style={{ marginTop: 'var(--space-5)', marginBottom: 0 }}>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', color: 'var(--color-fg-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', cursor: 'pointer', padding: 0 }}
            >
              ← Continue browsing
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

const navLinkStyle = { className: styles.navLink };
const navLinkActiveStyle = { className: `${styles.navLink} ${styles.navLinkActive}` };

function NavLinks({ user, orgSlug, orgId, onClose }: { user: User | null; orgSlug?: string; orgId?: string; onClose?: () => void }) {
  const { data: allMemberships } = useLiveQuery(membershipsCollection);
  const isAdmin = user && orgId
    ? (allMemberships ?? []).some((m: Membership) => m.organisation_id === orgId && m.user_id === user.id && m.role === 'admin')
    : false;

  return (
    <nav className={styles.nav}>
      {orgSlug ? (
        <>
          <Link to="/orgs/$slug/proposals" params={{ slug: orgSlug }} {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Proposals</Link>
          <Link to="/orgs/$slug/delegations" params={{ slug: orgSlug }} {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Delegations</Link>
          <Link to="/orgs/$slug/members" params={{ slug: orgSlug }} {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Members</Link>
          <Link to="/orgs/$slug/activity" params={{ slug: orgSlug }} {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Activity</Link>
          {isAdmin && (
            <Link to="/orgs/$slug/admin" params={{ slug: orgSlug }} {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Admin</Link>
          )}
        </>
      ) : (
        <Link to="/" {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Organisations</Link>
      )}
      {user && (
        <Link to="/settings" {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Settings</Link>
      )}
      <Link to="/pricing" {...navLinkStyle} activeProps={navLinkActiveStyle} onClick={onClose}>Pricing</Link>
    </nav>
  );
}

function Shell({ user, onLogout, onSignIn, orgSlug, orgId, children, notificationOrgSlug }: {
  user: User | null;
  onLogout: () => void;
  onSignIn?: () => void;
  orgSlug?: string;
  orgId?: string;
  notificationOrgSlug?: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const userSection = (
    <div className={styles.userSection}>
      {user ? (
        <>
          <div className={styles.userRow}>
            {orgSlug ? (
              <Link to="/orgs/$slug/users/$id" params={{ slug: orgSlug, id: user.id }} className={styles.userName}>
                {user.name}
              </Link>
            ) : (
              <span className={styles.userName}>{user.name}</span>
            )}
            <NotificationBell orgSlug={notificationOrgSlug ?? orgSlug} />
          </div>
          <button onClick={onLogout} className={styles.signOut}>Sign out</button>
        </>
      ) : onSignIn ? (
        <button
          onClick={onSignIn}
          style={{ background: 'none', border: 'none', color: 'var(--color-sidebar-fg)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', cursor: 'pointer', padding: 0, textAlign: 'left', fontWeight: 'var(--weight-medium)' }}
        >
          Sign in
        </button>
      ) : (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-sidebar-fg-muted)' }}>Not signed in</span>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className={styles.mobileShell}>
        <header className={styles.mobileHeader}>
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className={styles.menuButton}>
            ☰
          </button>
          <span className={styles.mobileWordmark}>Ripple</span>
        </header>

        {sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} className={styles.overlay} />
            <div className={styles.drawer}>
              <div className={styles.drawerHeader}>
                <span className={styles.drawerWordmark}>Ripple</span>
                <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className={styles.closeButton}>✕</button>
              </div>
              <NavLinks user={user} orgSlug={orgSlug} orgId={orgId} onClose={() => setSidebarOpen(false)} />
              {userSection}
            </div>
          </>
        )}

        <main className={styles.mobileMain}>{children}</main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <span className={styles.wordmark}>Ripple</span>
        <NavLinks user={user} orgSlug={orgSlug} orgId={orgId} />
        {userSection}
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {user && !user.email_verified && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '0.6rem 1.5rem', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Please verify your email address. Check your inbox for a verification link.</span>
          </div>
        )}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

// Root layout — no org context yet (used for / and /settings and /users/:id)
function RootComponent() {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [showAuth, setShowAuth] = useState(false);

  async function handleLogin(u: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    setShowAuth(false);
  }

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  if (!user) {
    return (
      <UserContext.Provider value={null}>
        <LandingPage onSignIn={() => setShowAuth(true)} />
        {showAuth && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--color-bg)' }}>
            <AuthPanel onLogin={handleLogin} onDismiss={() => setShowAuth(false)} />
          </div>
        )}
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
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const { slug } = useParams({ from: '/orgs/$slug' });
  const { data: allOrgs } = useLiveQuery(organisationsCollection);
  const org = (allOrgs ?? []).find((o: unknown) => (o as Organisation).slug === slug) as Organisation | undefined ?? null;
  const isLoading = !allOrgs;

  async function handleLogin(u: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    setShowAuthOverlay(false);
  }

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  // While org data loads, show a minimal loading state — we need the org to
  // decide whether to require auth, so we can't hard-block unauthed users yet.
  if (isLoading) {
    return (
      <UserContext.Provider value={user}>
        {user ? (
          <Shell user={user} onLogout={handleLogout} orgSlug={slug}>
            <p style={{ color: 'var(--color-fg-subtle)', fontSize: 'var(--text-base)' }}>Loading…</p>
          </Shell>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <p style={{ color: 'var(--color-fg-subtle)', fontSize: 'var(--text-base)' }}>Loading…</p>
          </div>
        )}
      </UserContext.Provider>
    );
  }

  // Private orgs (and unknown slugs) require sign-in.
  if (!user && (!org || !org.is_public)) {
    return (
      <UserContext.Provider value={null}>
        <AuthPanel onLogin={handleLogin} />
      </UserContext.Provider>
    );
  }

  if (!org) {
    return (
      <UserContext.Provider value={user}>
        <Shell user={user} onLogout={handleLogout}>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-error)' }}>Organisation "{slug}" not found.</p>
        </Shell>
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <OrgProvider org={org}>
        <Shell
          user={user}
          onLogout={handleLogout}
          onSignIn={!user ? () => setShowAuthOverlay(true) : undefined}
          orgSlug={slug}
          orgId={org.id}
        >
          <Outlet />
        </Shell>
      </OrgProvider>
      {showAuthOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <AuthPanel onLogin={handleLogin} onDismiss={() => setShowAuthOverlay(false)} />
        </div>
      )}
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

const orgLayout = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orgs/$slug',
  component: OrgLayout,
});

const joinRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/join',
  component: JoinPage,
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

const activityRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/activity',
  component: ActivityFeedPage,
});

const adminRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/admin',
  component: AdminPage,
});

const delegationNetworkRoute = createRoute({
  getParentRoute: () => orgLayout,
  path: '/delegations/network',
  component: DelegationNetworkPage,
});

const publicResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orgs/$slug/results',
  component: PublicResultsPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: VerifyEmailPage,
});

const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pricing',
  component: PricingPage,
});

const routeTree = rootRoute.addChildren([
  globalLayout.addChildren([indexRoute, settingsRoute]),
  orgLayout.addChildren([orgIndexRoute, proposalsRoute, proposalDetailRoute, delegationsRoute, delegationNetworkRoute, membersRoute, userProfileRoute, joinRoute, activityRoute, adminRoute]),
  publicResultsRoute,
  verifyEmailRoute,
  pricingRoute,
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
