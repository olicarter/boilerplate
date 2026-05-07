import { useEffect, useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { usersCollection, membershipsCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { proposalsApi, commentsApi, type TallyResult, type DelegationVote, type Proposal, type Topic, type Vote, type User, type Comment, type CommentReaction, type ProposalVersion, type Membership } from '../api';
import { VoteTally } from '../components/VoteTally';
import { MarkdownContent } from '../components/MarkdownContent';
import { EmptyState } from '../components/EmptyState';
import { ConfirmButton } from '../components/ConfirmButton';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';

const TITLE_MAX = 200;
const DESC_MAX = 10000;
const COMMENT_MAX = 5000;

type VoteChoice = 'yes' | 'no' | 'abstain';

const choiceColors: Record<VoteChoice, string> = {
  yes: '#2d9a4e',
  no: '#d94040',
  abstain: '#888',
};

function formatDeadline(closesAt: string): { label: string; subtext: string; urgent: boolean } {
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return { label: 'Closing shortly', subtext: '', urgent: true };
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  const date = new Date(closesAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (minutes < 60) return { label: `${minutes} minutes left`, subtext: `Closes ${date}`, urgent: true };
  if (hours < 24) return { label: `${hours} hour${hours !== 1 ? 's' : ''} left`, subtext: `Closes ${date}`, urgent: hours < 6 };
  return { label: `${days} day${days !== 1 ? 's' : ''} left`, subtext: `Closes ${date}`, urgent: false };
}

function computeResult(tally: TallyResult, threshold: number): 'passed' | 'failed' | 'no-votes' {
  const decisive = tally.yes + tally.no;
  if (decisive === 0) return 'no-votes';
  return (tally.yes / decisive) * 100 >= threshold ? 'passed' : 'failed';
}

export function ProposalDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const currentUser = useCurrentUser();
  const { org, collections: { proposalsCollection, topicsCollection, votesCollection, commentsCollection, commentReactionsCollection } } = useOrg();

  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allComments } = useLiveQuery(commentsCollection);
  const { data: allReactions } = useLiveQuery(commentReactionsCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);

  const addToast = useToast();

  const [tally, setTally] = useState<TallyResult | null>(null);
  const [tallyLoading, setTallyLoading] = useState(true);
  const [delegationVote, setDelegationVote] = useState<DelegationVote | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [changingVote, setChangingVote] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actioning, setActioning] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [versions, setVersions] = useState<ProposalVersion[] | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  const proposal = (allProposals ?? []).find((p: Proposal) => p.id === id);
  const topic = proposal
    ? (allTopics ?? []).find((t: Topic) => t.id === proposal.topic_id)
    : undefined;
  const author = proposal?.author_id
    ? (allUsers ?? []).find((u: User) => u.id === proposal.author_id)
    : undefined;
  const myVote = currentUser
    ? (allVotes ?? []).find((v: Vote) => v.proposal_id === id && v.user_id === currentUser.id)
    : undefined;

  const myMembership = currentUser
    ? (allMemberships ?? []).find((m: Membership) => m.organisation_id === org.id && m.user_id === currentUser.id)
    : undefined;
  const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };
  const isModerator = (ROLE_RANK[myMembership?.role ?? ''] ?? 0) >= ROLE_RANK['moderator'];

  async function fetchTally() {
    setTallyLoading(true);
    try {
      const result = await proposalsApi.tally(id);
      setTally(result);
    } catch {
      // ignore
    } finally {
      setTallyLoading(false);
    }
  }

  async function fetchMyDelegationVote() {
    if (!currentUser) return;
    try {
      const result = await proposalsApi.myDelegationVote(id);
      setDelegationVote(result);
    } catch {
      setDelegationVote(null);
    }
  }

  useEffect(() => {
    fetchTally();
    proposalsApi.versions(id).then(setVersions).catch(() => setVersions([]));
  }, [id]);

  useEffect(() => {
    if (currentUser && !myVote) {
      fetchMyDelegationVote();
    } else {
      setDelegationVote(null);
    }
  }, [id, currentUser?.id, myVote?.id]);

  async function castVote(choice: VoteChoice) {
    if (!currentUser) return;
    setVoteError('');
    setVoting(true);
    try {
      const tx = votesCollection.insert({
        id: uuid(),
        proposal_id: id,
        organisation_id: org.id,
        user_id: currentUser.id,
        choice,
        created_at: new Date().toISOString(),
      });
      await tx.isPersisted.promise;
      await fetchTally();
      setChangingVote(false);
      setDelegationVote(null);
      addToast('Vote cast', 'success');
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Failed to cast vote.');
    } finally {
      setVoting(false);
    }
  }

  async function changeVote(choice: VoteChoice) {
    if (!myVote) return;
    setVoteError('');
    setVoting(true);
    try {
      const tx = votesCollection.update(myVote.id, (draft: Vote) => {
        draft.choice = choice;
      });
      await tx.isPersisted.promise;
      await fetchTally();
      setChangingVote(false);
      addToast('Vote updated', 'success');
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Failed to update vote.');
    } finally {
      setVoting(false);
    }
  }

  async function removeVote() {
    if (!myVote) return;
    setVoteError('');
    setVoting(true);
    try {
      const tx = votesCollection.delete(myVote.id);
      await tx.isPersisted.promise;
      await fetchTally();
      addToast('Vote removed', 'info');
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Failed to remove vote.');
    } finally {
      setVoting(false);
    }
  }

  if (!proposal) {
    return <p style={{ color: '#999', fontSize: 14 }}>Loading…</p>;
  }

  const isDraft = proposal.status === 'draft';
  const isOpen = proposal.status === 'open';
  const isWithdrawn = proposal.status === 'withdrawn';
  const isAuthor = currentUser?.id === proposal.author_id;
  const delegateUser = delegationVote
    ? (allUsers ?? []).find((u: User) => u.id === delegationVote.delegate_id)
    : undefined;
  const threshold = proposal.threshold ?? 50;
  const deadline = isOpen && proposal.closes_at ? formatDeadline(proposal.closes_at) : null;
  const result = proposal.status === 'closed' && tally ? computeResult(tally, threshold) : null;
  const comments = (allComments ?? [])
    .filter((c: Comment) => c.proposal_id === id)
    .sort((a: Comment, b: Comment) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const userMap = Object.fromEntries((allUsers ?? []).map((u: User) => [u.id, u]));

  async function handleAction(successMsg: string, action: () => Promise<unknown>) {
    setActioning(true);
    setActionError('');
    try {
      await action();
      addToast(successMsg, 'success');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
    setActioning(false);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !commentBody.trim()) return;
    setPostingComment(true);
    try {
      const tx = commentsCollection.insert({
        id: uuid(),
        proposal_id: id,
        organisation_id: org.id,
        author_id: currentUser.id,
        body: commentBody.trim(),
        created_at: new Date().toISOString(),
      } as Comment);
      await tx.isPersisted.promise;
      setCommentBody('');
      addToast('Comment posted', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to post comment', 'error');
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const tx = commentsCollection.delete(commentId);
      await tx.isPersisted.promise;
      addToast('Comment deleted', 'info');
    } catch {
      addToast('Failed to delete comment', 'error');
    }
  }

  async function saveEditComment(commentId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!editCommentBody.trim()) return;
    try {
      const tx = commentsCollection.update(commentId, (draft: Comment) => {
        draft.body = editCommentBody.trim();
      });
      await tx.isPersisted.promise;
      setEditingCommentId(null);
      addToast('Comment updated', 'success');
    } catch {
      addToast('Failed to update comment', 'error');
    }
  }

  async function reactToComment(commentId: string, emoji: string) {
    try {
      await commentsApi.react(commentId, emoji);
    } catch {
      addToast('Failed to react', 'error');
    }
  }

  async function loadVersions() {
    if (versions !== null) {
      setShowVersions((v) => !v);
      return;
    }
    try {
      const data = await proposalsApi.versions(id);
      setVersions(data);
      setShowVersions(true);
    } catch {
      addToast('Failed to load version history', 'error');
    }
  }

  function startEditing() {
    setEditTitle(proposal.title);
    setEditDescription(proposal.description ?? '');
    setEditError('');
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      await proposalsApi.update(id, { title: editTitle.trim(), description: editDescription });
      addToast('Proposal updated', 'success');
      setEditing(false);
      proposalsApi.versions(id).then(setVersions).catch(() => {});
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <Link
        to="/orgs/$slug/proposals"
        params={{ slug: org.slug }}
        style={{ fontSize: 13, color: '#888', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}
      >
        ← Proposals
      </Link>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        {topic && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              background: '#e8f0fe',
              color: '#1a56d6',
              border: '1px solid #c3d6fb',
            }}
          >
            {topic.name}
          </span>
        )}
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: isDraft ? '#fff8e1' : isOpen ? '#e6f9ed' : '#f5f5f5',
            color: isDraft ? '#b45309' : isOpen ? '#2d9a4e' : '#888',
            border: `1px solid ${isDraft ? '#fde68a' : isOpen ? '#b3e5c2' : '#ddd'}`,
          }}
        >
          {proposal.status}
        </span>
        {result === 'passed' && (
          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#e6f9ed', color: '#2d9a4e', border: '1px solid #b3e5c2' }}>
            Passed
          </span>
        )}
        {result === 'failed' && (
          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#fdecea', color: '#d94040', border: '1px solid #f5c0c0' }}>
            Failed
          </span>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveEdit} style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label htmlFor="edit-title" style={{ fontSize: 13 }}>Title</label>
              {editTitle.length > TITLE_MAX - 40 && (
                <span style={{ fontSize: 11, color: editTitle.length >= TITLE_MAX ? '#d94040' : '#aaa' }}>
                  {TITLE_MAX - editTitle.length} left
                </span>
              )}
            </div>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value.slice(0, TITLE_MAX))}
              required
              maxLength={TITLE_MAX}
              style={{ width: '100%', padding: '0.5rem', fontSize: 15, fontWeight: 600, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label htmlFor="edit-description" style={{ fontSize: 13 }}>Description</label>
              {editDescription.length > DESC_MAX - 500 && (
                <span style={{ fontSize: 11, color: editDescription.length >= DESC_MAX ? '#d94040' : '#aaa' }}>
                  {DESC_MAX - editDescription.length} left
                </span>
              )}
            </div>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value.slice(0, DESC_MAX))}
              rows={5}
              maxLength={DESC_MAX}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
            />
          </div>
          {editError && <p style={{ color: '#d94040', fontSize: 13, margin: '0 0 0.75rem' }}>{editError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={saving} style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{proposal.title}</h2>
            {(isAuthor || isModerator) && (isDraft || isOpen) && (
              <button
                type="button"
                onClick={startEditing}
                style={{ fontSize: 12, padding: '0.2rem 0.6rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd', borderRadius: 4, flexShrink: 0, color: '#666' }}
              >
                Edit proposal
              </button>
            )}
          </div>
          {proposal.description && (
            <div style={{ margin: '0 0 0.75rem' }}>
              <MarkdownContent content={proposal.description} />
            </div>
          )}
          {versions !== null && versions.length > 0 && (
            <button
              type="button"
              onClick={loadVersions}
              style={{ fontSize: 11, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.5rem' }}
            >
              {showVersions ? 'Hide' : `Edited ${versions.length} time${versions.length !== 1 ? 's' : ''} — show history`}
            </button>
          )}
          {showVersions && versions && (
            <div style={{ border: '1px solid #eee', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1rem', background: '#fafafa' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edit history</p>
              {versions.map((v, i) => (
                <div key={v.id} style={{ fontSize: 12, color: '#888', marginBottom: i < versions.length - 1 ? '0.5rem' : 0 }}>
                  <span style={{ color: '#555' }}>{v.title}</span>
                  <span style={{ marginLeft: '0.5rem' }}>
                    · {new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {userMap[v.changed_by ?? ''] && (
                    <span style={{ marginLeft: '0.5rem' }}>by {userMap[v.changed_by!].name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 1.5rem' }}>
        {author ? (
          <>
            by{' '}
            <Link to="/orgs/$slug/users/$id" params={{ slug: org.slug, id: author.id }} style={{ color: '#888', textDecoration: 'none' }}>
              {author.name}
            </Link>
            {' · '}
          </>
        ) : null}
        {new Date(proposal.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        {proposal.closed_at && ` · Closed ${new Date(proposal.closed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`}
      </p>

      {/* Draft banner */}
      {isDraft && isAuthor && (
        <div style={{
          border: '1px solid #fde68a',
          borderRadius: 6,
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          background: '#fffbeb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <span style={{ fontSize: 14, color: '#92400e' }}>
            This proposal is a draft — not yet visible to other members.
          </span>
          <button
            onClick={() => handleAction('Proposal published', () => proposalsApi.publish(id))}
            disabled={actioning}
            style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', background: '#b45309', color: '#fff', border: 'none', borderRadius: 4, flexShrink: 0 }}
          >
            Publish
          </button>
        </div>
      )}

      {/* Deadline countdown */}
      {deadline && (
        <div
          style={{
            border: `1px solid ${deadline.urgent ? '#fde68a' : '#ddd'}`,
            borderRadius: 6,
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            background: deadline.urgent ? '#fffbeb' : '#f9f9f9',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: deadline.urgent ? '#b45309' : '#555' }}>
            {deadline.label}
          </span>
          {deadline.subtext && (
            <span style={{ fontSize: 13, color: '#888' }}>{deadline.subtext}</span>
          )}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div
          style={{
            border: `1px solid ${result === 'passed' ? '#b3e5c2' : result === 'failed' ? '#f5c0c0' : '#ddd'}`,
            borderRadius: 6,
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            background: result === 'passed' ? '#e6f9ed' : result === 'failed' ? '#fdecea' : '#f5f5f5',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: result === 'passed' ? '#2d9a4e' : result === 'failed' ? '#d94040' : '#888' }}>
            {result === 'passed' ? 'Proposal passed' : result === 'failed' ? 'Proposal failed' : 'No decisive votes cast'}
          </p>
          {result !== 'no-votes' && tally && (
            <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: '#666' }}>
              {Math.round((tally.yes / (tally.yes + tally.no)) * 100)}% yes
              {' '}({threshold}% required to pass)
            </p>
          )}
        </div>
      )}

      {/* Tally */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 6,
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          background: '#fafafa',
        }}
      >
        <h3 style={{ margin: '0 0 1rem', fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Results
        </h3>
        {org.voting_visibility === 'hidden' && isOpen ? (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Vote counts are hidden until this proposal closes.</p>
        ) : tallyLoading ? (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Loading tally…</p>
        ) : tally ? (
          <VoteTally tally={tally} />
        ) : (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Could not load tally.</p>
        )}
      </div>

      {/* Vote action */}
      {isOpen && (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '1rem 1.25rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your vote
          </h3>

          {/* Delegation override notice */}
          {currentUser && !myVote && delegationVote && (
            <div style={{
              background: '#f0f7ff',
              border: '1px solid #c3d6fb',
              borderRadius: 4,
              padding: '0.6rem 0.75rem',
              marginBottom: '0.75rem',
              fontSize: 13,
              color: '#444',
            }}>
              Your delegate{' '}
              <strong>{delegateUser?.name ?? 'someone'}</strong>{' '}
              voted{' '}
              <strong style={{ color: choiceColors[delegationVote.choice as VoteChoice] }}>
                {delegationVote.choice}
              </strong>{' '}
              on your behalf. Cast your own vote below to override.
            </div>
          )}

          {!currentUser ? (
            <p style={{ fontSize: 14, color: '#666' }}>
              Please sign in to vote on this proposal.
            </p>
          ) : myVote && !changingVote ? (
            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: 14 }}>
                You voted{' '}
                <strong style={{ color: choiceColors[myVote.choice as VoteChoice] }}>
                  {myVote.choice}
                </strong>
                .
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setChangingVote(true)}
                  disabled={voting}
                  style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer' }}
                >
                  Change vote
                </button>
                <ConfirmButton
                  label="Remove vote"
                  confirmLabel="Yes, remove"
                  onConfirm={removeVote}
                  disabled={voting}
                  style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none' }}
                  confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
                />
              </div>
            </div>
          ) : (
            <div>
              {changingVote && (
                <p style={{ margin: '0 0 0.75rem', fontSize: 13, color: '#666' }}>
                  Choose a new vote:
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['yes', 'no', 'abstain'] as VoteChoice[]).map((choice) => (
                  <button
                    key={choice}
                    onClick={() => (myVote ? changeVote(choice) : castVote(choice))}
                    disabled={voting}
                    style={{
                      fontSize: 13,
                      padding: '0.35rem 1rem',
                      cursor: 'pointer',
                      background: choiceColors[choice],
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      textTransform: 'capitalize',
                    }}
                  >
                    {choice}
                  </button>
                ))}
                {changingVote && (
                  <button
                    onClick={() => setChangingVote(false)}
                    style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {voteError && (
            <p style={{ color: '#d94040', fontSize: 13, margin: '0.75rem 0 0' }}>{voteError}</p>
          )}
        </div>
      )}

      {isWithdrawn && (
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: '0.75rem 1.25rem', background: '#f9f9f9', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#888' }}>This proposal was withdrawn — voting is no longer available.</p>
        </div>
      )}

      {!isOpen && !isWithdrawn && (
        <p style={{ fontSize: 13, color: '#aaa' }}>This proposal is closed — voting is no longer available.</p>
      )}

      {/* Author/moderator management actions */}
      {(isAuthor || isModerator) && !isWithdrawn && (
        <div
          style={{
            marginTop: '2rem',
            borderTop: '1px solid #eee',
            paddingTop: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 13, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Manage proposal
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isOpen && (
              <ConfirmButton
                label="Close voting"
                confirmLabel="Yes, close"
                onConfirm={() => handleAction('Voting closed', () => proposalsApi.close(id))}
                disabled={actioning}
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid #ddd', background: 'none' }}
              />
            )}
            {proposal.status === 'closed' && (
              <button
                onClick={() => handleAction('Proposal reopened', () => proposalsApi.reopen(id))}
                disabled={actioning}
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid #ddd', background: 'none' }}
              >
                Reopen
              </button>
            )}
            <ConfirmButton
              label="Withdraw"
              confirmLabel="Yes, withdraw"
              onConfirm={() => handleAction('Proposal withdrawn', () => proposalsApi.withdraw(id))}
              disabled={actioning}
              style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none' }}
              confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
            />
          </div>
          {actionError && (
            <p style={{ color: '#d94040', fontSize: 13, margin: '0.75rem 0 0' }}>{actionError}</p>
          )}
        </div>
      )}

      {/* Comments */}
      <div style={{ marginTop: '2.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Discussion ({comments.length})
        </h3>

        {comments.length === 0 && (
          <EmptyState
            variant="comments"
            title="No comments yet"
            description={currentUser ? 'Be the first to share your thoughts.' : undefined}
          />
        )}

        {comments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            {comments.map((c: Comment) => {
              const commentAuthor = c.author_id ? userMap[c.author_id] : undefined;
              const isOwn = currentUser?.id === c.author_id;
              return (
                <div key={c.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: '#666', flexShrink: 0,
                  }}>
                    {commentAuthor ? commentAuthor.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {commentAuthor?.name ?? 'Unknown'}
                      </span>
                      <span style={{ fontSize: 12, color: '#aaa' }}>
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {c.edited_at && (
                        <span style={{ fontSize: 11, color: '#bbb' }}>(edited)</span>
                      )}
                      {(isOwn || isModerator) && editingCommentId !== c.id && (
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.25rem' }}>
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                              style={{ fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                          )}
                          <ConfirmButton
                            label="Delete"
                            confirmLabel="Yes"
                            onConfirm={() => deleteComment(c.id)}
                            style={{ fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer' }}
                            confirmStyle={{ background: 'none', border: '1px solid #ddd', borderRadius: 3, color: '#d94040' }}
                          />
                        </span>
                      )}
                    </div>
                    {editingCommentId === c.id ? (
                      <form onSubmit={(e) => saveEditComment(c.id, e)}>
                        <textarea
                          value={editCommentBody}
                          onChange={(e) => setEditCommentBody(e.target.value.slice(0, COMMENT_MAX))}
                          rows={3}
                          maxLength={COMMENT_MAX}
                          style={{ width: '100%', padding: '0.4rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical', marginBottom: '0.4rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button type="submit" disabled={!editCommentBody.trim()} style={{ fontSize: 12, padding: '0.2rem 0.7rem', cursor: 'pointer' }}>
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingCommentId(null)} style={{ fontSize: 12, padding: '0.2rem 0.7rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd' }}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                          <MarkdownContent content={c.body} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                          {['👍', '👎', '❤️', '🤔'].map((emoji) => {
                            const reactionsForEmoji = (allReactions ?? []).filter(
                              (r: CommentReaction) => r.comment_id === c.id && r.emoji === emoji,
                            );
                            const count = reactionsForEmoji.length;
                            const hasReacted = currentUser
                              ? reactionsForEmoji.some((r: CommentReaction) => r.user_id === currentUser.id)
                              : false;
                            if (count === 0 && !currentUser) return null;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => currentUser && reactToComment(c.id, emoji)}
                                title={currentUser ? (hasReacted ? 'Remove reaction' : `React with ${emoji}`) : 'Sign in to react'}
                                style={{
                                  fontSize: 13,
                                  padding: '1px 6px',
                                  border: `1px solid ${hasReacted ? '#c3d6fb' : '#e0e0e0'}`,
                                  borderRadius: 10,
                                  background: hasReacted ? '#e8f0fe' : 'transparent',
                                  cursor: currentUser ? 'pointer' : 'default',
                                  opacity: count === 0 ? 0.35 : 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  color: '#555',
                                }}
                              >
                                {emoji}{count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentUser ? (
          <form onSubmit={postComment}>
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label htmlFor="comment-body" style={{ fontSize: 13, color: '#555' }}>Add a comment</label>
                {commentBody.length > COMMENT_MAX - 500 && (
                  <span style={{ fontSize: 11, color: commentBody.length >= COMMENT_MAX ? '#d94040' : '#aaa' }}>
                    {COMMENT_MAX - commentBody.length} left
                  </span>
                )}
              </div>
              <textarea
                id="comment-body"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value.slice(0, COMMENT_MAX))}
                rows={3}
                placeholder="Share your thoughts…"
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <button
              type="submit"
              disabled={postingComment || !commentBody.trim()}
              style={{ fontSize: 13, padding: '0.35rem 1rem' }}
            >
              {postingComment ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        ) : (
          <p style={{ fontSize: 14, color: '#888' }}>Sign in to join the discussion.</p>
        )}
      </div>
    </div>
  );
}
