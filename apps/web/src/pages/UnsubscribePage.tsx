import { useState, useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import { orgsApi } from '../api';

export function UnsubscribePage() {
  const search = useSearch({ strict: false }) as { token?: string };
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = search.token;
    if (!token) {
      setStatus('error');
      setError('No unsubscribe token found in this link.');
      return;
    }

    orgsApi.unsubscribeByToken(token)
      .then(({ org_name }) => {
        setOrgName(org_name);
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Invalid or expired unsubscribe link.');
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
        maxWidth: 400,
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

        {status === 'loading' && (
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)' }}>Processing…</p>
        )}

        {status === 'success' && (
          <>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Unsubscribed
            </p>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-5)' }}>
              You've been unsubscribed from email notifications for <strong>{orgName}</strong>.
              You can re-enable them in your membership settings.
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
              Back to Ripple
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Something went wrong
            </p>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-error)', marginBottom: 'var(--space-5)' }}>
              {error}
            </p>
            <a href="/" style={{ fontSize: 'var(--text-base)', color: 'var(--color-fg-muted)' }}>
              Back to Ripple
            </a>
          </>
        )}
      </div>
    </div>
  );
}
