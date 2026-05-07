import { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { orgsApi } from '../api';
import { useCurrentUser } from '../context';
import { useOrg } from '../OrgContext';
import { useToast } from '../components/Toast';

export function JoinPage() {
  const { org } = useOrg();
  const search = useSearch({ from: '/orgs/$slug/join' });
  const token = (search as Record<string, string>).token ?? '';
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const addToast = useToast();
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!token) return;
    setJoining(true);
    try {
      await orgsApi.joinViaToken(org.slug, token);
      addToast(`Joined ${org.name}`, 'success');
      navigate({ to: '/orgs/$slug', params: { slug: org.slug } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Invalid or expired invite link', 'error');
    } finally {
      setJoining(false);
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '4rem auto', textAlign: 'center' }}>
        <p style={{ color: '#d94040' }}>This invite link is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8, textAlign: 'center' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>{org.name}</h2>
      {org.description && <p style={{ color: '#555', fontSize: 14, marginBottom: '1.5rem' }}>{org.description}</p>}
      {currentUser ? (
        <button onClick={handleJoin} disabled={joining} style={{ padding: '0.6rem 1.5rem', fontSize: 15 }}>
          {joining ? 'Joining…' : 'Join organisation'}
        </button>
      ) : (
        <p style={{ color: '#888', fontSize: 14 }}>Sign in to join this organisation.</p>
      )}
    </div>
  );
}
