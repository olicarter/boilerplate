import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { proposalsCollection, topicsCollection, votesCollection, usersCollection, commentsCollection } from '../collections';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import type { Topic, Proposal, Vote, User, Comment } from '../api';

const TITLE_MAX = 200;
const DESC_MAX = 10000;

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
};

function toLocalDatetimeString(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function formatDeadline(closesAt: string): { label: string; urgent: boolean } {
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return { label: 'Closing soon', urgent: true };
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (minutes < 60) return { label: `${minutes}m left`, urgent: true };
  if (hours < 24) return { label: `${hours}h left`, urgent: hours < 6 };
  return { label: `${days}d left`, urgent: false };
}

function computeResult(yes: number, no: number, threshold: number): 'passed' | 'failed' | 'no-votes' {
  if (yes + no === 0) return 'no-votes';
  return (yes / (yes + no)) * 100 >= threshold ? 'passed' : 'failed';
}

function ProposalSkeleton() {
  return (
    <div style={{
      border: '1px solid #eee',
      borderRadius: 6,
      padding: '1rem 1.25rem',
      background: '#fafafa',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: '55%', height: 15, background: '#e4e4e4', borderRadius: 4, marginBottom: '0.5rem' }} />
      <div style={{ width: '85%', height: 12, background: '#e4e4e4', borderRadius: 4, marginBottom: '0.4rem' }} />
      <div style={{ width: '30%', height: 12, background: '#e4e4e4', borderRadius: 4 }} />
    </div>
  );
}

export function ProposalsPage() {
  const currentUser = useCurrentUser();
  const addToast = useToast();
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allComments } = useLiveQuery(commentsCollection);

  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [mineFilter, setMineFilter] = useState<'mine' | 'voted' | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'most-votes'>('newest');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const myVotedProposalIds = currentUser
    ? new Set((allVotes ?? []).filter((v: Vote) => v.user_id === currentUser.id).map((v: Vote) => v.proposal_id))
    : new Set<string>();

  const proposals = (allProposals ?? [])
    .filter((p: Proposal) => {
      if (topicFilter !== null && p.topic_id !== topicFilter) return false;
      if (p.status === 'draft' && p.author_id !== currentUser?.id) return false;
      if (statusFilter !== null && p.status !== statusFilter) return false;
      if (mineFilter === 'mine' && p.author_id !== currentUser?.id) return false;
      if (mineFilter === 'voted' && !myVotedProposalIds.has(p.id)) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a: Proposal, b: Proposal) => {
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'most-votes') {
        const aVotes = (allVotes ?? []).filter((v: Vote) => v.proposal_id === a.id).length;
        const bVotes = (allVotes ?? []).filter((v: Vote) => v.proposal_id === b.id).length;
        return bVotes - aVotes;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const topicMap = Object.fromEntries((allTopics ?? []).map((t: Topic) => [t.id, t]));
  const userMap = Object.fromEntries((allUsers ?? []).map((u: User) => [u.id, u]));

  function resetForm() {
    setTitle('');
    setDescription('');
    setTopicId('');
    setNewTopicName('');
    setClosesAt('');
    setThreshold(50);
    setShowForm(false);
    setFormError('');
  }

  async function handleCreate(asDraft = false) {
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
        author_id: currentUser.id,
        title: title.trim(),
        description: description.trim(),
        status: asDraft ? 'draft' : 'open',
        threshold,
        created_at: new Date().toISOString(),
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        closed_at: null,
      } as Proposal);
      await proposalTx.isPersisted.promise;

      addToast(asDraft ? 'Draft saved' : 'Proposal created');
      resetForm();
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
          onSubmit={(e) => { e.preventDefault(); handleCreate(false); }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label htmlFor="new-proposal-title" style={{ fontSize: 13 }}>Title</label>
              {title.length > TITLE_MAX - 40 && (
                <span style={{ fontSize: 11, color: title.length >= TITLE_MAX ? '#d94040' : '#aaa' }}>
                  {TITLE_MAX - title.length} left
                </span>
              )}
            </div>
            <input
              id="new-proposal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              required
              maxLength={TITLE_MAX}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label htmlFor="new-proposal-description" style={{ fontSize: 13 }}>
                Description <span style={{ color: '#aaa', fontWeight: 400 }}>(Markdown supported)</span>
              </label>
              {description.length > DESC_MAX - 500 && (
                <span style={{ fontSize: 11, color: description.length >= DESC_MAX ? '#d94040' : '#aaa' }}>
                  {DESC_MAX - description.length} left
                </span>
              )}
            </div>
            <textarea
              id="new-proposal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              rows={3}
              maxLength={DESC_MAX}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="new-proposal-topic" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Topic</label>
            <select
              id="new-proposal-topic"
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
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="new-topic-name" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>New topic name</label>
              <input
                id="new-topic-name"
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="new-proposal-closes-at" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                Voting deadline <span style={{ color: '#aaa' }}>(optional)</span>
              </label>
              <input
                id="new-proposal-closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                min={toLocalDatetimeString(new Date())}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
            <div>
              <label htmlFor="new-proposal-threshold" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                Passing threshold
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  id="new-proposal-threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Math.min(100, Math.max(1, parseInt(e.target.value) || 50)))}
                  min={1}
                  max={100}
                  style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
                />
                <span style={{ fontSize: 14, color: '#555', flexShrink: 0 }}>% yes</span>
              </div>
            </div>
          </div>
          {formError && <p style={{ color: '#d94040', fontSize: 13, margin: '0 0 0.75rem' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} style={{ padding: '0.4rem 1.25rem', fontSize: 13 }}>
              {submitting ? 'Creating…' : 'Create proposal'}
            </button>
            <button
              type="button"
              onClick={() => handleCreate(true)}
              disabled={submitting}
              style={{ padding: '0.4rem 1.25rem', fontSize: 13, border: '1px solid #ddd', background: 'none', cursor: 'pointer' }}
            >
              Save as draft
            </button>
          </div>
        </form>
      )}

      {/* Search + sort */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search proposals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}
        />
        <select
          aria-label="Sort proposals"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          style={{ padding: '0.45rem 0.6rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-votes">Most votes</option>
        </select>
      </div>

      {/* Topic filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
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
          All topics
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

      {/* Status + personal filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {([null, 'open', 'closed', 'withdrawn'] as const).map((s) => {
          const label = s === null ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1);
          const active = statusFilter === s;
          return (
            <button
              key={String(s)}
              onClick={() => setStatusFilter(s)}
              style={{
                ...badge,
                cursor: 'pointer',
                border: active ? '1px solid #1a56d6' : '1px solid #ddd',
                background: active ? '#e8f0fe' : '#f0f0f0',
                color: active ? '#1a56d6' : '#444',
              }}
            >
              {label}
            </button>
          );
        })}
        {currentUser && (
          <>
            <button
              onClick={() => setMineFilter(mineFilter === 'mine' ? null : 'mine')}
              style={{
                ...badge,
                cursor: 'pointer',
                border: mineFilter === 'mine' ? '1px solid #6d28d9' : '1px solid #ddd',
                background: mineFilter === 'mine' ? '#ede9fe' : '#f0f0f0',
                color: mineFilter === 'mine' ? '#6d28d9' : '#444',
              }}
            >
              My proposals
            </button>
            <button
              onClick={() => setMineFilter(mineFilter === 'voted' ? null : 'voted')}
              style={{
                ...badge,
                cursor: 'pointer',
                border: mineFilter === 'voted' ? '1px solid #6d28d9' : '1px solid #ddd',
                background: mineFilter === 'voted' ? '#ede9fe' : '#f0f0f0',
                color: mineFilter === 'voted' ? '#6d28d9' : '#444',
              }}
            >
              My votes
            </button>
          </>
        )}
      </div>

      {allProposals === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ProposalSkeleton />
          <ProposalSkeleton />
          <ProposalSkeleton />
        </div>
      ) : proposals.length === 0 ? (
        topicFilter !== null || statusFilter !== null || mineFilter !== null || search ? (
          <EmptyState
            variant="proposals"
            title="No proposals match these filters"
            description="Try adjusting your filters or search term."
          />
        ) : (
          <EmptyState
            variant="proposals"
            title="No proposals yet"
            description={currentUser ? 'Be the first to start a discussion.' : 'Sign in to create the first proposal.'}
          />
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {proposals.map((p: Proposal) => {
            const topic = topicMap[p.topic_id];
            const author = p.author_id ? userMap[p.author_id] : undefined;
            const votes = (allVotes ?? []).filter((v: Vote) => v.proposal_id === p.id);
            const yes = votes.filter((v: Vote) => v.choice === 'yes').length;
            const no = votes.filter((v: Vote) => v.choice === 'no').length;
            const abstain = votes.filter((v: Vote) => v.choice === 'abstain').length;
            const commentCount = (allComments ?? []).filter((c: Comment) => c.proposal_id === p.id).length;
            const myVote = currentUser
              ? votes.find((v: Vote) => v.user_id === currentUser.id)
              : undefined;

            const isDraft = p.status === 'draft';
            const isOpen = p.status === 'open';
            const isWithdrawn = p.status === 'withdrawn';
            const deadline = isOpen && p.closes_at ? formatDeadline(p.closes_at) : null;
            const result = p.status === 'closed' ? computeResult(yes, no, p.threshold ?? 50) : null;

            return (
              <Link
                key={p.id}
                to="/proposals/$id"
                params={{ id: p.id }}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: `1px solid ${isDraft ? '#fde68a' : '#ddd'}`,
                    borderRadius: 6,
                    padding: '1rem 1.25rem',
                    background: isDraft ? '#fffdf0' : '#fff',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isDraft ? '#f6cc00' : '#aaa'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isDraft ? '#fde68a' : '#ddd'; }}
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
                        {isDraft && (
                          <span style={{ ...badge, background: '#fff8e1', color: '#b45309', border: '1px solid #fde68a' }}>
                            Draft
                          </span>
                        )}
                        {result === 'passed' && (
                          <span style={{ ...badge, background: '#e6f9ed', color: '#2d9a4e', border: '1px solid #b3e5c2' }}>
                            Passed
                          </span>
                        )}
                        {result === 'failed' && (
                          <span style={{ ...badge, background: '#fdecea', color: '#d94040', border: '1px solid #f5c0c0' }}>
                            Failed
                          </span>
                        )}
                        {result === 'no-votes' && (
                          <span style={{ ...badge, background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                            No votes
                          </span>
                        )}
                        {isWithdrawn && (
                          <span style={{ ...badge, background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                            Withdrawn
                          </span>
                        )}
                        {isOpen && !deadline && (
                          <span style={{ ...badge, background: '#e6f9ed', color: '#2d9a4e', border: '1px solid #b3e5c2' }}>
                            Open
                          </span>
                        )}
                        {deadline && (
                          <span style={{
                            ...badge,
                            background: deadline.urgent ? '#fff8e1' : '#f5f5f5',
                            color: deadline.urgent ? '#b45309' : '#666',
                            border: `1px solid ${deadline.urgent ? '#fde68a' : '#ddd'}`,
                          }}>
                            {deadline.label}
                          </span>
                        )}
                        {myVote && (
                          <span style={{ fontSize: 12, color: '#888' }}>
                            Your vote: <strong>{myVote.choice}</strong>
                          </span>
                        )}
                      </div>
                      {author && (
                        <p style={{ margin: '0.4rem 0 0', fontSize: 12, color: '#aaa' }}>
                          by {author.name}
                        </p>
                      )}
                    </div>
                    {!isDraft && (
                      <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 13, color: '#666' }}>
                        <div style={{ color: '#2d9a4e' }}>↑ {yes}</div>
                        <div style={{ color: '#d94040' }}>↓ {no}</div>
                        {abstain > 0 && <div style={{ color: '#aaa' }}>— {abstain}</div>}
                        {commentCount > 0 && <div style={{ color: '#aaa', marginTop: '0.2rem' }}>{commentCount} comment{commentCount !== 1 ? 's' : ''}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
