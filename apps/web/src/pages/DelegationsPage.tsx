import { useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Link } from '@tanstack/react-router';
import { v4 as uuid } from 'uuid';
import { usersCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { UserSearch } from '../components/UserSearch';
import { ConfirmButton } from '../components/ConfirmButton';
import { EmptyState } from '../components/EmptyState';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import type { User, Delegation, Topic } from '../api';

export function DelegationsPage() {
  const currentUser = useCurrentUser();
  const { org, collections: { delegationsCollection, topicsCollection } } = useOrg();

  const { data: allDelegations } = useLiveQuery(delegationsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);

  const addToast = useToast();

  const [selectedDelegate, setSelectedDelegate] = useState<User | null>(null);
  const [scopeTopicId, setScopeTopicId] = useState<string>('__global__');
  const [expiresAt, setExpiresAt] = useState('');
  const [fallbackHours, setFallbackHours] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (!currentUser) {
    return (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ margin: '0 0 1.5rem' }}>Delegations</h2>
        <p style={{ fontSize: 14, color: '#666' }}>
          Please sign in to manage your delegations.
        </p>
      </div>
    );
  }

  const outgoing = (allDelegations ?? []).filter(
    (d: Delegation) => d.delegator_id === currentUser.id,
  );
  const incoming = (allDelegations ?? []).filter(
    (d: Delegation) => d.delegate_id === currentUser.id,
  );

  const topicMap = Object.fromEntries((allTopics ?? []).map((t: Topic) => [t.id, t]));
  const userMap = Object.fromEntries((allUsers ?? []).map((u: User) => [u.id, u]));

  function scopeLabel(topicId: string | null) {
    if (!topicId) return 'Global';
    return topicMap[topicId]?.name ?? topicId;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!selectedDelegate) {
      setFormError('Please select a delegate.');
      return;
    }
    if (selectedDelegate.id === currentUser!.id) {
      setFormError('You cannot delegate to yourself.');
      return;
    }

    const resolvedTopicId = scopeTopicId === '__global__' ? null : scopeTopicId;

    // Check for duplicate scope
    const duplicate = outgoing.find((d: Delegation) => d.topic_id === resolvedTopicId);
    if (duplicate) {
      setFormError(
        resolvedTopicId
          ? `You already have a delegation for topic "${scopeLabel(resolvedTopicId)}". Remove it first.`
          : 'You already have a global delegation. Remove it first.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const tx = delegationsCollection.insert({
        id: uuid(),
        organisation_id: org.id,
        delegator_id: currentUser!.id,
        delegate_id: selectedDelegate.id,
        topic_id: resolvedTopicId,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        fallback_abstain_hours: fallbackHours ? parseInt(fallbackHours, 10) : null,
        created_at: new Date().toISOString(),
      } as Delegation);
      await tx.isPersisted.promise;
      setSelectedDelegate(null);
      setScopeTopicId('__global__');
      setExpiresAt('');
      setFallbackHours('');
      addToast('Delegation added', 'success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add delegation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(delegationId: string) {
    try {
      const tx = delegationsCollection.delete(delegationId);
      await tx.isPersisted.promise;
      addToast('Delegation removed', 'info');
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Delegations</h2>
        <Link
          to="/orgs/$slug/delegations/network"
          params={{ slug: org.slug }}
          style={{ fontSize: 13, color: '#1a56d6', textDecoration: 'none' }}
        >
          View network graph →
        </Link>
      </div>

      {/* Your outgoing delegations */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
          You are delegating to
        </h3>
        {outgoing.length === 0 ? (
          <EmptyState
            variant="delegations"
            title="No delegations set"
            description="Delegate your vote to someone you trust on all topics or a specific one."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {outgoing.map((d: Delegation) => {
              const delegate = userMap[d.delegate_id];
              const expired = d.expires_at ? new Date(d.expires_at) <= new Date() : false;
              const expiresDate = d.expires_at
                ? new Date(d.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: `1px solid ${expired ? '#f5c0c0' : '#ddd'}`,
                    borderRadius: 6,
                    padding: '0.6rem 1rem',
                    fontSize: 14,
                    opacity: expired ? 0.7 : 1,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{delegate?.name ?? d.delegate_id}</span>
                    <span style={{ color: '#888', fontSize: 13, marginLeft: '0.5rem' }}>
                      {delegate?.email}
                    </span>
                    <span
                      style={{
                        marginLeft: '0.75rem',
                        fontSize: 12,
                        padding: '1px 7px',
                        borderRadius: 10,
                        background: d.topic_id ? '#e8f0fe' : '#f0f0f0',
                        color: d.topic_id ? '#1a56d6' : '#666',
                        border: `1px solid ${d.topic_id ? '#c3d6fb' : '#ddd'}`,
                      }}
                    >
                      {scopeLabel(d.topic_id)}
                    </span>
                    {expired && (
                      <span style={{ marginLeft: '0.5rem', fontSize: 12, color: '#d94040' }}>Expired</span>
                    )}
                    {!expired && expiresDate && (
                      <span style={{ marginLeft: '0.5rem', fontSize: 12, color: '#888' }}>· expires {expiresDate}</span>
                    )}
                    {d.fallback_abstain_hours != null && (
                      <span style={{ marginLeft: '0.5rem', fontSize: 12, color: '#888' }}>· voids if delegate doesn't vote within {d.fallback_abstain_hours}h of deadline</span>
                    )}
                  </div>
                  <ConfirmButton
                    label="Remove"
                    confirmLabel="Yes, remove"
                    onConfirm={() => handleRemove(d.id)}
                    style={{ fontSize: 12, color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer' }}
                    confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add new delegation */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
          Add delegation
        </h3>
        <form
          onSubmit={handleAdd}
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '1.25rem',
            background: '#fafafa',
          }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Delegate to</label>
            {selectedDelegate ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.4rem 0.75rem',
                  fontSize: 14,
                  background: '#fff',
                }}
              >
                <span>
                  <strong>{selectedDelegate.name}</strong>
                  <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: 13 }}>
                    {selectedDelegate.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDelegate(null)}
                  style={{ fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#888' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <UserSearch
                onSelect={setSelectedDelegate}
                excludeId={currentUser.id}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="delegation-scope" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Scope</label>
              <select
                id="delegation-scope"
                value={scopeTopicId}
                onChange={(e) => setScopeTopicId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
              >
                <option value="__global__">Global (all topics)</option>
                {(allTopics ?? []).map((t: Topic) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="delegation-expires-at" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                Expires <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="delegation-expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="delegation-fallback" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Conditional <span style={{ color: '#aaa', fontWeight: 400 }}>(optional — void if delegate hasn't voted within N hours of deadline)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="delegation-fallback"
                type="number"
                min={1}
                max={168}
                value={fallbackHours}
                onChange={(e) => setFallbackHours(e.target.value)}
                placeholder="e.g. 48"
                style={{ width: 80, padding: '0.4rem 0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
              />
              <span style={{ fontSize: 13, color: '#666' }}>hours before deadline</span>
            </div>
          </div>

          {formError && (
            <p style={{ color: '#d94040', fontSize: 13, margin: '0 0 0.75rem' }}>{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedDelegate}
            style={{ fontSize: 13, padding: '0.4rem 1.25rem', cursor: 'pointer' }}
          >
            {submitting ? 'Adding…' : 'Add delegation'}
          </button>
        </form>
      </section>

      {/* Delegated to you */}
      <section>
        <h3 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
          Delegated to you
        </h3>
        {incoming.length === 0 ? (
          <EmptyState
            variant="delegations"
            title="Nobody has delegated to you yet"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incoming.map((d: Delegation) => {
              const delegator = userMap[d.delegator_id];
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    padding: '0.6rem 1rem',
                    fontSize: 14,
                  }}
                >
                  <span>
                    <span style={{ fontWeight: 500 }}>{delegator?.name ?? d.delegator_id}</span>
                    <span style={{ color: '#888', fontSize: 13, marginLeft: '0.5rem' }}>
                      {delegator?.email}
                    </span>
                    <span
                      style={{
                        marginLeft: '0.75rem',
                        fontSize: 12,
                        padding: '1px 7px',
                        borderRadius: 10,
                        background: d.topic_id ? '#e8f0fe' : '#f0f0f0',
                        color: d.topic_id ? '#1a56d6' : '#666',
                        border: `1px solid ${d.topic_id ? '#c3d6fb' : '#ddd'}`,
                      }}
                    >
                      {scopeLabel(d.topic_id)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
