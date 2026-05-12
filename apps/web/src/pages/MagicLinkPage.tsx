import { useState, useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import { authApi } from '../api';

const STORAGE_KEY = 'ripple_user';

export function MagicLinkPage() {
  const search = useSearch({ strict: false }) as { token?: string };
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = search.token;
    if (!token) {
      setStatus('error');
      setError('No sign-in token found in this link.');
      return;
    }

    authApi.magicLinkVerify(token)
      .then((user) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        window.location.href = '/';
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Sign-in failed. The link may have expired or already been used.');
      });
  }, []);

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
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: 'var(--color-fg)',
          marginBottom: 'var(--space-5)',
        }}>
          Ripple
        </div>

        {status === 'verifying' && (
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)' }}>Signing you in…</p>
        )}

        {status === 'error' && (
          <>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Sign-in failed
            </p>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-error)', marginBottom: 'var(--space-5)' }}>
              {error}
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                height: 36,
                lineHeight: '36px',
                padding: '0 var(--space-5)',
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--weight-medium)',
                textDecoration: 'none',
              }}
            >
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
