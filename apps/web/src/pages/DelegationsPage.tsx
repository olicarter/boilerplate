import { useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { delegationsCollection, topicsCollection, usersCollection } from '../collections';
import { UserSearch } from '../components/UserSearch';
import { useCurrentUser } from '../context';
import type { User, Delegation, Topic } from '../api';

export function DelegationsPage() {
  const currentUser = useCurrentUser();

  const { data: allDelegations } = useLiveQuery(delegationsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);

  const [selectedDelegate, setSelectedDelegate] = useState<User | null>(null);
  const [scopeTopicId, setScopeTopicId] = useState<string>('__global__');
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
        delegator_id: currentUser!.id,
        delegate_id: selectedDelegate.id,
        topic_id: resolvedTopicId,
        created_at: new Date().toISOString(),
      });
      await tx.isPersisted.promise;
      setSelectedDelegate(null);
      setScopeTopicId('__global__');
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
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: '0 0 1.5rem' }}>Delegations</h2>

      {/* Your outgoing delegations */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
          You are delegating to
        </h3>
        {outgoing.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999' }}>No delegations set.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {outgoing.map((d: Delegation) => {
              const delegate = userMap[d.delegate_id];
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
                  </div>
                  <button
                    onClick={() => handleRemove(d.id)}
                    style={{ fontSize: 12, color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
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

          <div style={{ marginBottom: '1rem' }}>
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
          <p style={{ fontSize: 14, color: '#999' }}>Nobody has delegated to you yet.</p>
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
