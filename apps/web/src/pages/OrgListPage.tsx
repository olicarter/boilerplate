import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { organisationsCollection, membershipsCollection } from '../collections';
import { orgsApi, type Organisation, type Membership } from '../api';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import styles from './OrgListPage.module.css';

export function OrgListPage() {
  const currentUser = useCurrentUser();
  const addToast = useToast();
  const navigate = useNavigate();

  const { data: allOrgs } = useLiveQuery(organisationsCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);

  const myOrgIds = new Set(
    ((allMemberships ?? []) as Membership[])
      .filter((m) => m.user_id === currentUser?.id)
      .map((m) => m.organisation_id),
  );
  const myOrgs = ((allOrgs ?? []) as Organisation[]).filter((o) => myOrgIds.has(o.id));
  const discoverOrgs = currentUser
    ? ((allOrgs ?? []) as Organisation[]).filter((o) => o.is_public && !myOrgIds.has(o.id))
    : [];

  // Skip the org list entirely when the user belongs to exactly one org.
  const isLoaded = allOrgs !== undefined && allMemberships !== undefined;
  useEffect(() => {
    if (isLoaded && myOrgs.length === 1) {
      navigate({ to: '/orgs/$slug', params: { slug: myOrgs[0].slug }, replace: true });
    }
  }, [isLoaded, myOrgs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  async function handleJoinPublic(slug: string) {
    setJoiningSlug(slug);
    try {
      await orgsApi.joinPublic(slug);
      addToast('Joined organisation', 'success');
      navigate({ to: '/orgs/$slug', params: { slug } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to join', 'error');
    } finally {
      setJoiningSlug(null);
    }
  }

  const hasOrgs = myOrgs.length > 0;
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [joiningViaLink, setJoiningViaLink] = useState(false);

  async function handleJoinViaLink(e: React.FormEvent) {
    e.preventDefault();
    const input = inviteInput.trim();
    let slug = '';
    let token = '';
    try {
      const url = new URL(input.startsWith('http') ? input : `https://dummy.com/${input}`);
      const parts = url.pathname.split('/').filter(Boolean);
      const orgIdx = parts.indexOf('orgs');
      if (orgIdx !== -1 && parts[orgIdx + 1]) slug = parts[orgIdx + 1];
      token = url.searchParams.get('invite') ?? '';
    } catch {
      slug = input;
    }
    if (!slug || !token) {
      addToast('Invalid invite link. Paste the full URL you received.', 'error');
      return;
    }
    setJoiningViaLink(true);
    try {
      await orgsApi.joinViaToken(slug, token);
      addToast('Joined organisation!', 'success');
      navigate({ to: '/orgs/$slug', params: { slug } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to join', 'error');
    } finally {
      setJoiningViaLink(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    setNameError('');
    if (!trimmed) {
      setNameError('Organisation name is required.');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }
    setCreating(true);
    try {
      const result = await orgsApi.create({ name: trimmed, description: description.trim() });
      addToast('Organisation created', 'success');
      setShowCreate(false);
      setName('');
      setDescription('');
      navigate({ to: '/orgs/$slug', params: { slug: result.item.slug } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create organisation', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Organisations</h2>
        {currentUser && !showCreate && hasOrgs && (
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New organisation</Button>
        )}
      </div>

      {showCreate && (
        <form className={styles.form} onSubmit={handleCreate}>
          <h3 className={styles.formTitle}>New organisation</h3>
          <div className={styles.formField}>
            <label htmlFor="org-name" className={styles.formLabel}>Name</label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              autoFocus
              className={styles.formInput}
              aria-describedby={nameError ? 'org-name-error' : undefined}
            />
            {nameError && <p id="org-name-error" className={styles.fieldError} role="alert">{nameError}</p>}
          </div>
          <div className={styles.formField}>
            <label htmlFor="org-desc" className={styles.formLabel}>
              Description <span className={styles.formLabelNote}>(optional)</span>
            </label>
            <textarea
              id="org-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={styles.formTextarea}
            />
          </div>
          <div className={styles.formActions}>
            <Button type="submit" disabled={creating || !name.trim()} size="sm">
              {creating ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {myOrgs.length === 0 ? (
        showCreate ? null : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Welcome to Ripple</p>
            <p className={styles.emptyDescription}>
              Make decisions together — create an organisation and run your first vote in minutes, or join one with an invite link.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: 400 }}>
              <Button onClick={() => setShowCreate(true)}>
                Create an organisation
              </Button>
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--color-bg)', padding: '0 0.75rem', fontSize: 12, color: 'var(--color-fg-muted)' }}>or</span>
              </div>
              <form onSubmit={handleJoinViaLink} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: 13, color: 'var(--color-fg-muted)', fontWeight: 500 }}>Have an invite link?</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="Paste invite link…"
                    style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 14 }}
                  />
                  <Button type="submit" disabled={joiningViaLink || !inviteInput.trim()} size="sm">
                    {joiningViaLink ? 'Joining…' : 'Join'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      ) : (
        <div className={styles.list}>
          {myOrgs.map((org) => (
            <Link key={org.id} to="/orgs/$slug" params={{ slug: org.slug }} className={styles.card}>
              <div className={styles.cardInner}>
                <h3 className={styles.cardName}>{org.name}</h3>
                {org.description && <p className={styles.cardDescription}>{org.description}</p>}
                <p className={styles.cardSlug}>/{org.slug}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {discoverOrgs.length > 0 && (
        <div className={styles.discoverSection}>
          <h3 className={styles.discoverHeading}>Discover</h3>
          <div className={styles.discoverList}>
            {discoverOrgs.map((org) => (
              <div key={org.id} className={styles.discoverCard}>
                <div style={{ minWidth: 0 }}>
                  <h3 className={styles.cardName}>{org.name}</h3>
                  {org.description && <p className={styles.cardDescription}>{org.description}</p>}
                  <p className={styles.cardSlug}>/{org.slug}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleJoinPublic(org.slug)}
                  disabled={joiningSlug === org.slug}
                >
                  {joiningSlug === org.slug ? 'Joining…' : 'Join'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
