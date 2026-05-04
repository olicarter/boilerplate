import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { proposalsCollection, topicsCollection, votesCollection } from '../collections';
import { useCurrentUser } from '../context';
import type { Topic, Proposal, Vote } from '../api';

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
};

export function ProposalsPage() {
  const currentUser = useCurrentUser();
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);

  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const proposals = (allProposals ?? []).filter(
    (p: Proposal) => topicFilter === null || p.topic_id === topicFilter,
  );

  const topicMap = Object.fromEntries((allTopics ?? []).map((t: Topic) => [t.id, t]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setFormError('');
    setSubmitting(true);
    try {
      let resolvedTopicId = topicId;

      if (topicId === '__new__') {
        const name = newTopicName.trim();
        if (!name) {
          setFormError('Topic name is required.');
          setSubmitting(false);
          return;
        }
        resolvedTopicId = uuid();
        const topicTx = topicsCollection.insert({
          id: resolvedTopicId,
          name,
          description: '',
          created_at: new Date().toISOString(),
        } as Topic);
        await topicTx.isPersisted.promise;
      }

      if (!resolvedTopicId) {
        setFormError('Please select a topic.');
        setSubmitting(false);
        return;
      }

      const proposalTx = proposalsCollection.insert({
        id: uuid(),
        topic_id: resolvedTopicId,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
        created_at: new Date().toISOString(),
        closed_at: null,
      });
      await proposalTx.isPersisted.promise;

      setTitle('');
      setDescription('');
      setTopicId('');
      setNewTopicName('');
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create proposal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Proposals</h2>
        {currentUser && (
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ fontSize: 13, padding: '0.4rem 1rem', cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ New proposal'}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '1.25rem',
            marginBottom: '1.5rem',
            background: '#fafafa',
          }}
        >
          <h3 style={{ margin: '0 0 1rem', fontSize: 15 }}>New proposal</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="">Select a topic…</option>
              {(allTopics ?? []).map((t: Topic) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value="__new__">＋ New topic…</option>
            </select>
          </div>
          {topicId === '__new__' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>New topic name</label>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
          )}
          {formError && <p style={{ color: '#d94040', fontSize: 13, margin: '0 0 0.75rem' }}>{formError}</p>}
          <button type="submit" disabled={submitting} style={{ padding: '0.4rem 1.25rem', fontSize: 13 }}>
            {submitting ? 'Creating…' : 'Create proposal'}
          </button>
        </form>
      )}

      {/* Topic filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
<button
           onClick={() => setTopicFilter(null)}
           style={{
             ...badge,
             cursor: 'pointer',
             border: topicFilter === null ? '1px solid #555' : '1px solid #ddd',
             background: topicFilter === null ? '#555' : '#f0f0f0',
             color: topicFilter === null ? '#fff' : '#444',
           }}
         >
           All
         </button>
         {(allTopics ?? []).map((t: Topic) => (
          <button
            key={t.id}
            onClick={() => setTopicFilter(topicFilter === t.id ? null : t.id)}
            style={{
              ...badge,
              cursor: 'pointer',
              border: topicFilter === t.id ? '1px solid #555' : '1px solid #ddd',
              background: topicFilter === t.id ? '#555' : '#f0f0f0',
              color: topicFilter === t.id ? '#fff' : '#444',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {proposals.length === 0 && (
        <p style={{ color: '#999', fontSize: 14 }}>No proposals yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {proposals.map((p: Proposal) => {
          const topic = topicMap[p.topic_id];
          const votes = (allVotes ?? []).filter((v: Vote) => v.proposal_id === p.id);
          const yes = votes.filter((v: Vote) => v.choice === 'yes').length;
          const no = votes.filter((v: Vote) => v.choice === 'no').length;
          const abstain = votes.filter((v: Vote) => v.choice === 'abstain').length;
          const myVote = currentUser
            ? votes.find((v: Vote) => v.user_id === currentUser.id)
            : undefined;

          return (
            <Link
              key={p.id}
              to="/proposals/$id"
              params={{ id: p.id }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '1rem 1.25rem',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#aaa';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#ddd';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: 15 }}>{p.title}</p>
                    {p.description && (
                      <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {topic && (
                        <span style={{ ...badge, background: '#e8f0fe', color: '#1a56d6', border: '1px solid #c3d6fb' }}>
                          {topic.name}
                        </span>
                      )}
                      <span
                        style={{
                          ...badge,
                          background: p.status === 'open' ? '#e6f9ed' : '#f5f5f5',
                          color: p.status === 'open' ? '#2d9a4e' : '#888',
                          border: `1px solid ${p.status === 'open' ? '#b3e5c2' : '#ddd'}`,
                        }}
                      >
                        {p.status}
                      </span>
                      {myVote && (
                        <span style={{ fontSize: 12, color: '#888' }}>
                          Your vote: <strong>{myVote.choice}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 13, color: '#666' }}>
                    <div style={{ color: '#2d9a4e' }}>↑ {yes}</div>
                    <div style={{ color: '#d94040' }}>↓ {no}</div>
                    {abstain > 0 && <div style={{ color: '#aaa' }}>— {abstain}</div>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
