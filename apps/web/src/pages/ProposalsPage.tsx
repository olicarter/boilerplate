import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { usersCollection, membershipsCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { proposalOptionsApi } from '../api';
import type { Topic, Proposal, Vote, User, Comment, Membership } from '../api';

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

const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };

export function ProposalsPage() {
  const currentUser = useCurrentUser();
  const addToast = useToast();
  const { org, collections: { proposalsCollection, topicsCollection, votesCollection, commentsCollection } } = useOrg();
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allComments } = useLiveQuery(commentsCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);

  const myMembership = currentUser
    ? (allMemberships ?? []).find((m: Membership) => m.organisation_id === org.id && m.user_id === currentUser.id)
    : undefined;
  const canCreateProposal = myMembership
    ? (ROLE_RANK[myMembership.role] ?? 0) >= (ROLE_RANK[org.proposal_creation_role ?? 'member'] ?? 1)
    : false;
  const canCreateTopic = myMembership
    ? (ROLE_RANK[myMembership.role] ?? 0) >= (ROLE_RANK[org.topic_creation_role ?? 'member'] ?? 1)
    : false;

  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [mineFilter, setMineFilter] = useState<'mine' | 'voted' | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'most-votes'>('newest');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [closesAt, setClosesAt] = useState(() => {
    const days = org.default_voting_duration_days;
    if (!days) return '';
    const d = new Date(Date.now() + days * 86400000);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
  });
  const [threshold, setThreshold] = useState(org.default_threshold ?? 50);
  const THRESHOLD_PRESETS = [
    { label: 'Simple majority', value: 50 },
    { label: 'Two-thirds', value: 67 },
    { label: 'Three-quarters', value: 75 },
  ];
  const [deliberationEndsAt, setDeliberationEndsAt] = useState('');
  const [quorum, setQuorum] = useState<number | null>(org.default_quorum ?? null);
  const [quorumType, setQuorumType] = useState<'soft' | 'hard'>('soft');
  const [proposalType, setProposalType] = useState<'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent' | 'approval' | 'score_voting' | 'ranked_choice'>('standard');
  const [mcOptions, setMcOptions] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const myVotedProposalIds = currentUser
    ? new Set((allVotes ?? []).filter((v: Vote) => v.user_id === currentUser.id).map((v: Vote) => v.proposal_id))
    : new Set<string>();

  const allTags = [...new Set((allProposals ?? []).flatMap((p: Proposal) => p.tags ?? []))].sort();

  const proposals = (allProposals ?? [])
    .filter((p: Proposal) => {
      if (topicFilter !== null && p.topic_id !== topicFilter) return false;
      if (p.status === 'draft' && p.author_id !== currentUser?.id) return false;
      if (statusFilter !== null && p.status !== statusFilter) return false;
      if (mineFilter === 'mine' && p.author_id !== currentUser?.id) return false;
      if (mineFilter === 'voted' && !myVotedProposalIds.has(p.id)) return false;
      if (tagFilter !== null && !(p.tags ?? []).includes(tagFilter)) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a: Proposal, b: Proposal) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
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
    const days = org.default_voting_duration_days;
    if (days) {
      const d = new Date(Date.now() + days * 86400000);
      const offset = d.getTimezoneOffset();
      setClosesAt(new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16));
    } else {
      setClosesAt('');
    }
    setDeliberationEndsAt('');
    setThreshold(org.default_threshold ?? 50);
    setQuorum(org.default_quorum ?? null);
    setQuorumType('soft');
    setProposalType('standard');
    setMcOptions(['', '']);
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
          organisation_id: org.id,
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

      const proposalId = uuid();
      const needsOptions = ['multiple_choice', 'approval', 'score_voting', 'ranked_choice'].includes(proposalType);
      if (needsOptions) {
        const validOpts = mcOptions.map((o) => o.trim()).filter(Boolean);
        if (validOpts.length < 2) {
          setFormError('This proposal type needs at least 2 options.');
          setSubmitting(false);
          return;
        }
      }
      const noDeadline = proposalType === 'discussion';
      const proposalTx = proposalsCollection.insert({
        id: proposalId,
        organisation_id: org.id,
        topic_id: resolvedTopicId,
        author_id: currentUser.id,
        title: title.trim(),
        description: description.trim(),
        status: asDraft ? 'draft' : 'open',
        proposal_type: proposalType,
        threshold,
        quorum,
        quorum_type: quorumType,
        created_at: new Date().toISOString(),
        closes_at: noDeadline ? null : (closesAt ? new Date(closesAt).toISOString() : null),
        deliberation_ends_at: noDeadline ? null : (deliberationEndsAt ? new Date(deliberationEndsAt).toISOString() : null),
        closed_at: null,
      } as Proposal);
      await proposalTx.isPersisted.promise;
      if (needsOptions) {
        const validOpts = mcOptions.map((o) => o.trim()).filter(Boolean);
        await Promise.all(validOpts.map((text, i) =>
          proposalOptionsApi.create(proposalId, { id: uuid(), text, position: i }),
        ));
      }

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
        {canCreateProposal && (
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ fontSize: 13, padding: '0.4rem 1rem', cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ New proposal'}
          </button>
        )}
      </div>

      {showForm && canCreateProposal && (
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>New proposal</h3>
            {((org as { proposal_templates?: unknown[] }).proposal_templates ?? []).length > 0 && (
              <select
                data-testid="use-template-select"
                defaultValue=""
                onChange={(e) => {
                  const tmplId = e.target.value;
                  if (!tmplId) return;
                  const templates = (org as { proposal_templates?: Array<{ id: string; name: string; description: string; proposal_type: 'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent'; threshold: number }> }).proposal_templates ?? [];
                  const tmpl = templates.find((t) => t.id === tmplId);
                  if (!tmpl) return;
                  setDescription(tmpl.description);
                  setProposalType(tmpl.proposal_type);
                  setThreshold(tmpl.threshold);
                  e.target.value = '';
                }}
                style={{ fontSize: 12, padding: '0.25rem 0.5rem', border: '1px solid #ddd', borderRadius: 4, color: '#555' }}
              >
                <option value="">Use template…</option>
                {((org as { proposal_templates?: Array<{ id: string; name: string }> }).proposal_templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
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
              {canCreateTopic && <option value="__new__">＋ New topic…</option>}
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
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Proposal type</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {([
                { value: 'standard', label: 'Vote' },
                { value: 'multiple_choice', label: 'Multiple choice' },
                { value: 'approval', label: 'Approval' },
                { value: 'score_voting', label: 'Score' },
                { value: 'ranked_choice', label: 'Ranked choice' },
                { value: 'temperature_check', label: 'Temperature check' },
                { value: 'consent', label: 'Consent' },
                { value: 'discussion', label: 'Discussion only' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`proposal-type-${value}`}
                  onClick={() => setProposalType(value)}
                  style={{
                    fontSize: 13,
                    padding: '0.3rem 0.9rem',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    background: proposalType === value ? '#222' : 'none',
                    color: proposalType === value ? '#fff' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {proposalType === 'discussion' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>Discussion-only proposals have no formal vote — members comment and deliberate only.</p>
            )}
            {proposalType === 'multiple_choice' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>Members pick one option. Add at least 2 options below.</p>
            )}
            {proposalType === 'approval' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>Members approve as many options as they like. The most-approved option wins.</p>
            )}
            {proposalType === 'score_voting' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>Members rate each option 0–5. The highest mean score wins.</p>
            )}
            {proposalType === 'ranked_choice' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>Members rank options in order of preference. Instant-runoff voting determines the winner.</p>
            )}
            {proposalType === 'temperature_check' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>A non-binding straw poll to gauge sentiment before a formal vote. Results are advisory only.</p>
            )}
            {proposalType === 'consent' && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>Passes unless someone raises a paramount objection (Block). Good for consensus-oriented groups.</p>
            )}
          </div>
          {(['multiple_choice', 'approval', 'score_voting', 'ranked_choice'] as const).includes(proposalType as any) && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Options</label>
              {mcOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <input
                    data-testid={`mc-option-${i}`}
                    type="text"
                    value={opt}
                    onChange={(e) => setMcOptions((prev) => prev.map((o, j) => j === i ? e.target.value : o))}
                    placeholder={`Option ${i + 1}`}
                    maxLength={500}
                    style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  />
                  {mcOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setMcOptions((prev) => prev.filter((_, j) => j !== i))}
                      style={{ fontSize: 13, padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
                    >×</button>
                  )}
                </div>
              ))}
              {mcOptions.length < 8 && (
                <button
                  type="button"
                  data-testid="mc-add-option"
                  onClick={() => setMcOptions((prev) => [...prev, ''])}
                  style={{ fontSize: 12, color: '#3358c4', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                >+ Add option</button>
              )}
            </div>
          )}
          {proposalType !== 'discussion' && (<><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="new-proposal-deliberation-ends-at" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                Deliberation ends <span style={{ color: '#aaa' }}>(optional)</span>
              </label>
              <input
                id="new-proposal-deliberation-ends-at"
                type="datetime-local"
                value={deliberationEndsAt}
                onChange={(e) => setDeliberationEndsAt(e.target.value)}
                min={toLocalDatetimeString(new Date())}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>Discussion only until this time; voting opens after.</p>
            </div>
            <div>
              <label htmlFor="new-proposal-closes-at" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                Voting deadline <span style={{ color: '#aaa' }}>(optional)</span>
              </label>
              <input
                id="new-proposal-closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                min={deliberationEndsAt || toLocalDatetimeString(new Date())}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
            <div>
              <label htmlFor="new-proposal-threshold" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Passing threshold</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {THRESHOLD_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setThreshold(p.value)}
                    style={{
                      fontSize: 13,
                      padding: '0.3rem 0.75rem',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      background: threshold === p.value ? '#222' : 'none',
                      color: threshold === p.value ? '#fff' : '#333',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label} ({p.value}%)
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    id="new-proposal-threshold"
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Math.min(100, Math.max(1, parseInt(e.target.value) || 50)))}
                    min={1}
                    max={100}
                    style={{ width: 70, padding: '0.3rem 0.5rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  />
                  <span style={{ fontSize: 13, color: '#555' }}>% yes</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="new-proposal-quorum" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Quorum <span style={{ color: '#aaa' }}>(optional — % of members who must participate)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  id="new-proposal-quorum"
                  type="number"
                  value={quorum ?? ''}
                  onChange={(e) => setQuorum(e.target.value === '' ? null : Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={100}
                  placeholder="e.g. 50"
                  style={{ width: 90, padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
                />
                <span style={{ fontSize: 14, color: '#555' }}>%</span>
              </div>
              {quorum !== null && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {(['soft', 'hard'] as const).map((qt) => (
                    <label key={qt} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 13, cursor: 'pointer' }}>
                      <input type="radio" name="quorum_type" value={qt} checked={quorumType === qt} onChange={() => setQuorumType(qt)} />
                      {qt === 'soft' ? 'Soft (advisory)' : 'Hard (auto-fail)'}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div></>)}
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

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {allTags.map((tag: string) => (
            <button
              key={tag}
              data-testid={`tag-filter-${tag}`}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              style={{
                ...badge,
                cursor: 'pointer',
                border: tagFilter === tag ? '1px solid #3358c4' : '1px solid #c7d2fe',
                background: tagFilter === tag ? '#e8edf7' : '#f5f7ff',
                color: '#3358c4',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {allProposals === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ProposalSkeleton />
          <ProposalSkeleton />
          <ProposalSkeleton />
        </div>
      ) : proposals.length === 0 ? (
        topicFilter !== null || statusFilter !== null || mineFilter !== null || tagFilter !== null || search ? (
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
            const isDeliberating = isOpen && !!p.deliberation_ends_at && new Date(p.deliberation_ends_at as string) > new Date();
            const deadline = isOpen && p.closes_at ? formatDeadline(p.closes_at) : null;
            const result = p.status === 'closed' ? computeResult(yes, no, p.threshold ?? 50) : null;

            return (
              <Link
                key={p.id}
                to="/orgs/$slug/proposals/$id"
                params={{ slug: org.slug, id: p.id }}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: `1px solid ${p.pinned ? '#c7d2fe' : isDraft ? '#fde68a' : '#ddd'}`,
                    borderRadius: 6,
                    padding: '1rem 1.25rem',
                    background: p.pinned ? '#f5f7ff' : isDraft ? '#fffdf0' : '#fff',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = p.pinned ? '#818cf8' : isDraft ? '#f6cc00' : '#aaa'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = p.pinned ? '#c7d2fe' : isDraft ? '#fde68a' : '#ddd'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: 15 }}>
                        {p.pinned && <span style={{ marginRight: '0.4rem', fontSize: 13 }} aria-label="Pinned">📌</span>}
                        {p.title}
                      </p>
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
                        {p.proposal_type === 'discussion' && (
                          <span style={{ ...badge, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                            Discussion
                          </span>
                        )}
                        {p.proposal_type === 'multiple_choice' && (
                          <span style={{ ...badge, background: '#f0f4ff', color: '#3358c4', border: '1px solid #c7d2fe' }}>
                            Multiple choice
                          </span>
                        )}
                        {p.proposal_type === 'approval' && (
                          <span style={{ ...badge, background: '#f0f4ff', color: '#3358c4', border: '1px solid #c7d2fe' }}>
                            Approval
                          </span>
                        )}
                        {p.proposal_type === 'score_voting' && (
                          <span style={{ ...badge, background: '#f0f4ff', color: '#3358c4', border: '1px solid #c7d2fe' }}>
                            Score
                          </span>
                        )}
                        {p.proposal_type === 'ranked_choice' && (
                          <span style={{ ...badge, background: '#f0f4ff', color: '#3358c4', border: '1px solid #c7d2fe' }}>
                            Ranked choice
                          </span>
                        )}
                        {p.proposal_type === 'temperature_check' && (
                          <span style={{ ...badge, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                            Temp check
                          </span>
                        )}
                        {p.proposal_type === 'consent' && (
                          <span style={{ ...badge, background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
                            Consent
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
                        {isDeliberating && (
                          <span style={{ ...badge, background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                            Deliberating
                          </span>
                        )}
                        {isOpen && !deadline && !isDeliberating && (
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
                      {p.tags && (p.tags as string[]).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                          {(p.tags as string[]).map((tag: string) => (
                            <span key={tag} data-testid={`proposal-card-tag-${tag}`} style={{ fontSize: 11, padding: '0.1rem 0.4rem', borderRadius: 10, background: '#e8edf7', color: '#3358c4' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      {author && (
                        <p style={{ margin: '0.4rem 0 0', fontSize: 12, color: '#aaa' }}>
                          by {author.name}
                        </p>
                      )}
                    </div>
                    {!isDraft && (
                      <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 13, color: '#666' }}>
                        {(org.voting_visibility !== 'hidden' || !isOpen) ? (
                          <>
                            <div style={{ color: '#2d9a4e' }}>↑ {yes}</div>
                            <div style={{ color: '#d94040' }}>↓ {no}</div>
                            {abstain > 0 && <div style={{ color: '#aaa' }}>— {abstain}</div>}
                          </>
                        ) : (
                          <div style={{ color: '#bbb', fontSize: 11 }}>hidden</div>
                        )}
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
