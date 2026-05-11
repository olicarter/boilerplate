import { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { orgsApi } from '../api';
import { useCurrentUser } from '../context';
import { useOrg } from '../OrgContext';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import styles from './JoinPage.module.css';

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
      <div className={styles.wrapper}>
        <p className={styles.error}>This invite link is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.orgName}>{org.name}</h2>
        {org.description && <p className={styles.orgDescription}>{org.description}</p>}
        {currentUser ? (
          <Button onClick={handleJoin} disabled={joining}>
            {joining ? 'Joining…' : 'Join organisation'}
          </Button>
        ) : (
          <p className={styles.signIn}>Sign in to join this organisation.</p>
        )}
      </div>
    </div>
  );
}
