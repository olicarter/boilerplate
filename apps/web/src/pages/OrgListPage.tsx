import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { organisationsCollection, membershipsCollection } from '../collections';
import { orgsApi, type Organisation, type Membership } from '../api';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';

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

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
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
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Organisations</h2>
        {currentUser && !showCreate && (
          <button onClick={() => setShowCreate(true)} style={{ fontSize: 13, padding: '0.35rem 0.9rem' }}>
            + New organisation
          </button>
        )}
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', background: '#fafafa' }}
        >
          <h3 style={{ margin: '0 0 1rem', fontSize: 14 }}>New organisation</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="org-name" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Name</label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="org-desc" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Description <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="org-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={creating || !name.trim()} style={{ fontSize: 13, padding: '0.35rem 0.9rem' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} style={{ fontSize: 13, padding: '0.35rem 0.9rem', background: 'none', border: '1px solid #ddd' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {myOrgs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#aaa' }}>
          <p style={{ fontSize: 15, marginBottom: '0.5rem' }}>No organisations yet.</p>
          {currentUser ? (
            <p style={{ fontSize: 13 }}>Create one to start voting.</p>
          ) : (
            <p style={{ fontSize: 13 }}>Sign in to join or create an organisation.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {myOrgs.map((org) => (
            <Link
              key={org.id}
              to="/orgs/$slug"
              params={{ slug: org.slug }}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem 1.25rem', background: '#fff', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#999')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ddd')}
              >
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{org.name}</h3>
                {org.description && <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{org.description}</p>}
                <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: '#aaa' }}>/{org.slug}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {discoverOrgs.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: 13, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
            Discover
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {discoverOrgs.map((org) => (
              <div
                key={org.id}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem 1.25rem', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{org.name}</h3>
                  {org.description && <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{org.description}</p>}
                  <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: '#aaa' }}>/{org.slug}</p>
                </div>
                <button
                  onClick={() => handleJoinPublic(org.slug)}
                  disabled={joiningSlug === org.slug}
                  style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', flexShrink: 0 }}
                >
                  {joiningSlug === org.slug ? 'Joining…' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
