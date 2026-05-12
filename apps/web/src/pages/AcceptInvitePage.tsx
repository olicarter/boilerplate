import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { orgsApi, type User } from '../api';
import styles from './AcceptInvitePage.module.css';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('ripple_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}

export function AcceptInvitePage() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const token = search.token ?? '';
  const [currentUser] = useState<User | null>(getStoredUser);
  const navigate = useNavigate();

  const [info, setInfo] = useState<{ org: { id: string; name: string; description: string; slug: string }; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('This invitation link is invalid.');
      setLoading(false);
      return;
    }
    orgsApi.getInviteInfo(token)
      .then(setInfo)
      .catch(() => setError('This invitation is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!currentUser || !info) return;
    setJoining(true);
    try {
      await orgsApi.acceptInvite(token);
      setJoined(true);
      setTimeout(() => navigate({ to: '/orgs/$slug/proposals', params: { slug: info.org.slug } }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join. Please try again.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.wordmark}>Ripple</div>

        {loading && <p className={styles.loading}>Loading invitation…</p>}

        {!loading && error && (
          <>
            <p className={styles.error}>{error}</p>
            <a href="/" className={styles.link}>Go to Ripple</a>
          </>
        )}

        {!loading && !error && info && (
          <>
            <h1 className={styles.orgName}>{info.org.name}</h1>
            {info.org.description && <p className={styles.orgDescription}>{info.org.description}</p>}

            <div className={styles.inviteNote}>
              You've been invited to join this organisation.
            </div>

            {joined ? (
              <p className={styles.success}>You've joined {info.org.name}! Redirecting…</p>
            ) : currentUser ? (
              currentUser.email.toLowerCase() === info.email.toLowerCase() ? (
                <button
                  className={styles.joinBtn}
                  onClick={handleAccept}
                  disabled={joining}
                >
                  {joining ? 'Joining…' : `Join ${info.org.name}`}
                </button>
              ) : (
                <p className={styles.error}>
                  This invitation was sent to <strong>{info.email}</strong>, but you're signed in as <strong>{currentUser.email}</strong>. Sign in with the correct account to accept.
                </p>
              )
            ) : (
              <p className={styles.signInNote}>
                Sign in or create an account to accept this invitation. Your invite will be waiting.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
