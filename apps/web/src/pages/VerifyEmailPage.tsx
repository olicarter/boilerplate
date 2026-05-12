import { useState, useEffect } from 'react';
import { authApi } from '../api';

export function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found.');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email address has been verified. You can close this tab.');
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      });
  }, []);

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      {status === 'loading' && <p style={{ color: '#888', fontSize: 15 }}>Verifying your email…</p>}
      {status === 'success' && (
        <>
          <h1 style={{ fontSize: 22, margin: '0 0 0.75rem' }}>Email verified</h1>
          <p style={{ color: '#555', fontSize: 15 }}>{message}</p>
          <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: 14, color: '#333', textDecoration: 'underline' }}>
            Go to Ripple
          </a>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 style={{ fontSize: 22, margin: '0 0 0.75rem' }}>Verification failed</h1>
          <p style={{ color: '#d94040', fontSize: 15 }}>{message}</p>
          <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: 14, color: '#333', textDecoration: 'underline' }}>
            Go to Ripple
          </a>
        </>
      )}
    </div>
  );
}
