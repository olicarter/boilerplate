import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { usersCollection, membershipsCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { proposalsApi, commentsApi, argumentsApi, vetoesApi, endorsementsApi, orgsApi, type TallyResult, type DelegationVote, type DelegationChain, type Proposal, type ProposalOption, type ProposalReaction, type Topic, type Vote, type User, type Comment, type CommentReaction, type ProposalVersion, type Membership, type Argument, type Veto, type Endorsement } from '../api';
import { VoteTally } from '../components/VoteTally';
import { MarkdownContent } from '../components/MarkdownContent';
import { EmptyState } from '../components/EmptyState';
import { ConfirmButton } from '../components/ConfirmButton';
import { MentionTextarea, type MentionTextareaHandle } from '../components/MentionTextarea';
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

function computeResult(tally: TallyResult, threshold: number, quorumType?: 'soft' | 'hard', vetoed?: boolean): 'passed' | 'failed' | 'no-votes' {
  if (vetoed) return 'failed';
  if (tally.quorum_met === false && quorumType === 'hard') return 'failed';
  const decisive = tally.yes + tally.no;
  if (decisive === 0) return 'no-votes';
  return (tally.yes / decisive) * 100 >= threshold ? 'passed' : 'failed';
}

export function ProposalDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const currentUser = useCurrentUser();
  const { org, collections: { proposalsCollection, topicsCollection, votesCollection, commentsCollection, commentReactionsCollection, argumentsCollection, proposalOptionsCollection } } = useOrg();

  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allProposalOptions } = useLiveQuery(proposalOptionsCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allComments } = useLiveQuery(commentsCollection);
  const { data: allReactions } = useLiveQuery(commentReactionsCollection);
  const { data: allArguments } = useLiveQuery(argumentsCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);

  const addToast = useToast();

  const [tally, setTally] = useState<TallyResult | null>(null);
  const [tallyLoading, setTallyLoading] = useState(true);
  const [delegationVote, setDelegationVote] = useState<DelegationVote | null>(null);
  const [delegationChain, setDelegationChain] = useState<DelegationChain | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [changingVote, setChangingVote] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actioning, setActioning] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const commentTextareaRef = useRef<MentionTextareaHandle>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [hidingCommentId, setHidingCommentId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [argBody, setArgBody] = useState('');
  const [argSide, setArgSide] = useState<'for' | 'against'>('for');
  const [postingArg, setPostingArg] = useState(false);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [vetoes, setVetoes] = useState<Veto[]>([]);
  const [vetoReason, setVetoReason] = useState('');
  const [castingVeto, setCastingVeto] = useState(false);
  const [showVetoForm, setShowVetoForm] = useState(false);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [endorsing, setEndorsing] = useState(false);
  const [minEndorsementsLive, setMinEndorsementsLive] = useState<number | null>(null);
  const [versions, setVersions] = useState<ProposalVersion[] | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [reactions, setReactions] = useState<ProposalReaction[]>([]);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

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
  const vetoRole = (org as { veto_role?: string }).veto_role ?? 'admin';
  const canVeto = currentUser && (ROLE_RANK[myMembership?.role ?? ''] ?? 0) >= (ROLE_RANK[vetoRole] ?? ROLE_RANK['admin']);
  const myVeto = currentUser ? vetoes.find((v) => v.author_id === currentUser.id) : undefined;
  const minEndorsements = minEndorsementsLive ?? (org as { min_endorsements?: number }).min_endorsements ?? 0;
  const myEndorsement = currentUser ? endorsements.find((e) => e.user_id === currentUser.id) : undefined;
  const endorsementsNeeded = Math.max(0, minEndorsements - endorsements.length);

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
      const [vote, chain] = await Promise.all([
        proposalsApi.myDelegationVote(id),
        proposalsApi.myDelegationChain(id),
      ]);
      setDelegationVote(vote);
      setDelegationChain(chain);
    } catch {
      setDelegationVote(null);
      setDelegationChain(null);
    }
  }

  async function fetchVetoes() {
    try {
      const result = await fetch(`/api/proposals/${id}/vetoes`, { credentials: 'include' });
      if (result.ok) setVetoes(await result.json());
    } catch {
      // ignore
    }
  }

  async function fetchEndorsements() {
    try {
      const result = await endorsementsApi.list(id);
      setEndorsements(result);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchTally();
    fetchVetoes();
    fetchEndorsements();
    proposalsApi.versions(id).then(setVersions).catch(() => setVersions([]));
    orgsApi.get(org.slug).then((o) => setMinEndorsementsLive(o.min_endorsements ?? 0)).catch(() => {});
    proposalsApi.listReactions(id).then(setReactions).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (currentUser && !myVote) {
      fetchMyDelegationVote();
    } else {
      setDelegationVote(null);
      setDelegationChain(null);
    }
  }, [id, currentUser?.id, myVote?.id]);

  async function castVote(choice: VoteChoice | null, optionId?: string) {
    if (!currentUser) return;
    setVoteError('');
    setVoting(true);
    try {
      const tx = votesCollection.insert({
        id: uuid(),
        proposal_id: id,
        organisation_id: org.id,
        user_id: currentUser.id,
        choice: choice ?? null,
        option_id: optionId ?? null,
        created_at: new Date().toISOString(),
      });
      await tx.isPersisted.promise;
      await fetchTally();
      setChangingVote(false);
      setDelegationVote(null);
      setDelegationChain(null);
      addToast('Vote cast', 'success');
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Failed to cast vote.');
    } finally {
      setVoting(false);
    }
  }

  async function changeVote(choice: VoteChoice | null, optionId?: string) {
    if (!myVote) return;
    setVoteError('');
    setVoting(true);
    try {
      const tx = votesCollection.update(myVote.id, (draft: Vote) => {
        draft.choice = choice ?? null;
        draft.option_id = optionId ?? null;
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
  const isDiscussion = proposal.proposal_type === 'discussion';
  const isMultipleChoice = proposal.proposal_type === 'multiple_choice';
  const proposalOptions = ((allProposalOptions ?? []) as ProposalOption[])
    .filter((o) => o.proposal_id === id)
    .sort((a, b) => a.position - b.position);
  const isDeliberating = isOpen && !!proposal.deliberation_ends_at && new Date(proposal.deliberation_ends_at as string) > new Date();
  const isAuthor = currentUser?.id === proposal.author_id;
  const canEndorse = currentUser && isDraft && !isAuthor && !!myMembership && !myEndorsement;
  const publishBlocked = isDraft && minEndorsements > 0 && endorsements.length < minEndorsements;
  const threshold = proposal.threshold ?? 50;
  const deadline = isOpen && proposal.closes_at ? formatDeadline(proposal.closes_at) : null;
  const result = proposal.status === 'closed' && tally ? computeResult(tally, threshold, proposal.quorum_type as 'soft' | 'hard', vetoes.length > 0) : null;
  const comments = (allComments ?? [])
    .filter((c: Comment) => c.proposal_id === id)
    .sort((a: Comment, b: Comment) => {
      // Pinned first, then chronological
      if (a.pinned_at && !b.pinned_at) return -1;
      if (!a.pinned_at && b.pinned_at) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  const proposalArguments = (allArguments ?? [])
    .filter((a: Argument) => a.proposal_id === id)
    .sort((a: Argument, b: Argument) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const forArguments = proposalArguments.filter((a: Argument) => a.side === 'for');
  const againstArguments = proposalArguments.filter((a: Argument) => a.side === 'against');
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

  function quoteReply(body: string) {
    const quoted = body
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    setCommentBody((prev) => (prev ? `${prev}\n\n${quoted}\n\n` : `${quoted}\n\n`));
    requestAnimationFrame(() => commentTextareaRef.current?.focus());
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

  async function postArgument(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !argBody.trim()) return;
    setPostingArg(true);
    try {
      await argumentsApi.create(id, { id: crypto.randomUUID(), side: argSide, body: argBody.trim() });
      setArgBody('');
      addToast(`${argSide === 'for' ? 'For' : 'Against'} argument added`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to post argument', 'error');
    } finally {
      setPostingArg(false);
    }
  }

  async function deleteArgument(argId: string) {
    try {
      await argumentsApi.delete(argId);
      addToast('Argument removed', 'info');
    } catch {
      addToast('Failed to delete argument', 'error');
    }
  }

  async function pinComment(commentId: string) {
    try {
      await commentsApi.pin(commentId);
      addToast('Comment pinned', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to pin comment', 'error');
    }
  }

  async function unpinComment(commentId: string) {
    try {
      await commentsApi.unpin(commentId);
      addToast('Comment unpinned', 'info');
    } catch {
      addToast('Failed to unpin comment', 'error');
    }
  }

  async function handleReact(emoji: string) {
    if (!currentUser || reactingEmoji) return;
    setReactingEmoji(emoji);
    try {
      const myReaction = reactions.find((r) => r.user_id === currentUser.id);
      if (myReaction?.emoji === emoji) {
        await proposalsApi.removeReaction(id);
        setReactions((prev) => prev.filter((r) => r.user_id !== currentUser.id));
      } else {
        const updated = await proposalsApi.react(id, emoji);
        setReactions((prev) => {
          const without = prev.filter((r) => r.user_id !== currentUser.id);
          return [...without, updated];
        });
      }
    } catch {
      addToast('Failed to react', 'error');
    } finally {
      setReactingEmoji(null);
    }
  }

  async function endorseProposal() {
    if (!canEndorse) return;
    setEndorsing(true);
    try {
      await endorsementsApi.endorse(id);
      await fetchEndorsements();
      addToast('Proposal endorsed', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to endorse', 'error');
    } finally {
      setEndorsing(false);
    }
  }

  async function retractEndorsement() {
    setEndorsing(true);
    try {
      await endorsementsApi.retract(id);
      await fetchEndorsements();
      addToast('Endorsement retracted', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to retract', 'error');
    } finally {
      setEndorsing(false);
    }
  }

  async function castVeto(e: React.FormEvent) {
    e.preventDefault();
    const reason = vetoReason.trim();
    if (!reason) return;
    setCastingVeto(true);
    try {
      await vetoesApi.cast(id, reason);
      setVetoReason('');
      setShowVetoForm(false);
      await fetchVetoes();
      addToast('Veto cast', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to cast veto', 'error');
    } finally {
      setCastingVeto(false);
    }
  }

  async function retractVeto(vetoId: string) {
    try {
      await vetoesApi.retract(vetoId);
      await fetchVetoes();
      addToast('Veto retracted', 'info');
    } catch {
      addToast('Failed to retract veto', 'error');
    }
  }

  async function saveOutcome(outcome: Proposal['outcome']) {
    setSavingOutcome(true);
    try {
      await proposalsApi.setOutcome(id, outcome);
      addToast('Outcome saved', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save outcome', 'error');
    } finally {
      setSavingOutcome(false);
    }
  }

  async function hideComment(commentId: string, e: React.FormEvent) {
    e.preventDefault();
    const reason = hideReason.trim();
    if (!reason) return;
    try {
      await commentsApi.hide(commentId, reason);
      setHidingCommentId(null);
      setHideReason('');
      addToast('Comment hidden', 'info');
    } catch {
      addToast('Failed to hide comment', 'error');
    }
  }

  async function unhideComment(commentId: string) {
    try {
      await commentsApi.unhide(commentId);
      addToast('Comment restored', 'success');
    } catch {
      addToast('Failed to unhide comment', 'error');
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
        {proposal.pinned && (
          <span
            data-testid="pinned-badge"
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              background: '#eef2ff',
              color: '#4f46e5',
              border: '1px solid #c7d2fe',
            }}
          >
            📌 Pinned
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
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
              {proposal.title}
              {isDiscussion && (
                <span style={{ marginLeft: '0.5rem', fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', verticalAlign: 'middle' }}>
                  Discussion
                </span>
              )}
              {isMultipleChoice && (
                <span style={{ marginLeft: '0.5rem', fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: '#f0f4ff', color: '#3358c4', border: '1px solid #c7d2fe', verticalAlign: 'middle' }}>
                  Multiple choice
                </span>
              )}
            </h2>
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

      {/* Reactions */}
      {currentUser && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['👍', '👎', '💬', '🎉', '🤔'] as const).map((emoji) => {
            const count = reactions.filter((r) => r.emoji === emoji).length;
            const myReaction = reactions.find((r) => r.user_id === currentUser.id);
            const isMyEmoji = myReaction?.emoji === emoji;
            return (
              <button
                key={emoji}
                data-testid={`reaction-${emoji}`}
                onClick={() => handleReact(emoji)}
                disabled={!!reactingEmoji}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.65rem',
                  border: `1px solid ${isMyEmoji ? '#818cf8' : '#ddd'}`,
                  borderRadius: 20,
                  background: isMyEmoji ? '#eef2ff' : '#fafafa',
                  cursor: reactingEmoji ? 'default' : 'pointer',
                  fontSize: 14,
                  color: '#555',
                  fontWeight: isMyEmoji ? 600 : 400,
                  transition: 'border-color 0.1s, background 0.1s',
                }}
              >
                <span>{emoji}</span>
                {count > 0 && <span style={{ fontSize: 12 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Draft banner + endorsements */}
      {isDraft && (
        <div style={{ marginBottom: '1.5rem' }}>
          {/* Endorsement progress */}
          {minEndorsements > 0 && (
            <div style={{
              border: `1px solid ${publishBlocked ? '#fde68a' : '#b3e5c2'}`,
              borderRadius: 6,
              padding: '0.75rem 1.25rem',
              marginBottom: '0.75rem',
              background: publishBlocked ? '#fffbeb' : '#e6f9ed',
            }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: 14, fontWeight: 600, color: publishBlocked ? '#92400e' : '#2d9a4e' }}>
                {endorsements.length} / {minEndorsements} endorsement{minEndorsements !== 1 ? 's' : ''}
                {publishBlocked ? ` — ${endorsementsNeeded} more needed to publish` : ' — ready to publish'}
              </p>
              {endorsements.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                  {endorsements.map((e) => {
                    const endorser = userMap[e.user_id];
                    return (
                      <span key={e.id} data-testid="endorsement-badge" style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#e6f9ed', border: '1px solid #b3e5c2', color: '#1a7f37' }}>
                        {endorser?.name ?? 'Member'}
                      </span>
                    );
                  })}
                </div>
              )}
              {canEndorse && (
                <button
                  type="button"
                  onClick={endorseProposal}
                  disabled={endorsing}
                  data-testid="endorse-btn"
                  style={{ marginTop: '0.5rem', fontSize: 13, padding: '0.3rem 0.9rem', cursor: 'pointer', background: '#1a7f37', color: '#fff', border: 'none', borderRadius: 4 }}
                >
                  {endorsing ? 'Endorsing…' : 'Endorse this proposal'}
                </button>
              )}
              {myEndorsement && (
                <button
                  type="button"
                  onClick={retractEndorsement}
                  disabled={endorsing}
                  data-testid="retract-endorsement-btn"
                  style={{ marginTop: '0.5rem', fontSize: 12, padding: '0.3rem 0.7rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd', borderRadius: 4, color: '#888' }}
                >
                  Retract endorsement
                </button>
              )}
            </div>
          )}

          {isAuthor && (
            <div style={{
              border: '1px solid #fde68a',
              borderRadius: 6,
              padding: '0.75rem 1.25rem',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}>
              <span style={{ fontSize: 14, color: '#92400e' }}>
                {publishBlocked
                  ? `Needs ${endorsementsNeeded} more endorsement${endorsementsNeeded !== 1 ? 's' : ''} before publishing.`
                  : 'This proposal is a draft — not yet visible to other members.'}
              </span>
              <button
                onClick={() => handleAction('Proposal published', () => proposalsApi.publish(id))}
                disabled={actioning || publishBlocked}
                title={publishBlocked ? `${endorsementsNeeded} more endorsement${endorsementsNeeded !== 1 ? 's' : ''} required` : undefined}
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: publishBlocked ? 'not-allowed' : 'pointer', background: publishBlocked ? '#aaa' : '#b45309', color: '#fff', border: 'none', borderRadius: 4, flexShrink: 0 }}
              >
                Publish
              </button>
            </div>
          )}
          {!isAuthor && minEndorsements === 0 && (
            <div style={{ border: '1px solid #fde68a', borderRadius: 6, padding: '0.75rem 1.25rem', background: '#fffbeb' }}>
              <span style={{ fontSize: 14, color: '#92400e' }}>This proposal is a draft.</span>
            </div>
          )}
        </div>
      )}

      {/* Deliberation / Voting timeline */}
      {isOpen && proposal.deliberation_ends_at && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 13 }}>
            {[
              { key: 'deliberation', label: 'Deliberation', active: isDeliberating, done: !isDeliberating },
              { key: 'voting', label: 'Voting', active: !isDeliberating, done: false },
              { key: 'closed', label: 'Closed', active: false, done: false },
            ].map((phase, i, arr) => (
              <div key={phase.key} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                <div style={{
                  padding: '0.3rem 0.9rem',
                  borderRadius: 20,
                  fontWeight: phase.active ? 600 : 400,
                  background: phase.active ? '#6d28d9' : phase.done ? '#e6f9ed' : '#f0f0f0',
                  color: phase.active ? '#fff' : phase.done ? '#2d9a4e' : '#888',
                  border: `1px solid ${phase.active ? '#6d28d9' : phase.done ? '#b3e5c2' : '#e0e0e0'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {phase.done ? '✓ ' : ''}{phase.label}
                </div>
                {i < arr.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: '#e0e0e0', minWidth: 20 }} />
                )}
              </div>
            ))}
          </div>
          {isDeliberating && (
            <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: '#6d28d9' }}>
              Deliberation ends {new Date(proposal.deliberation_ends_at as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} — voting opens after.
            </p>
          )}
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
      {result && tally && !isDiscussion && (
        <div
          style={{
            border: `1px solid ${tally.quorum_met === false && proposal.quorum_type !== 'hard' ? '#fde68a' : result === 'passed' ? '#b3e5c2' : result === 'failed' ? '#f5c0c0' : '#ddd'}`,
            borderRadius: 6,
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            background: tally.quorum_met === false && proposal.quorum_type !== 'hard' ? '#fffbeb' : result === 'passed' ? '#e6f9ed' : result === 'failed' ? '#fdecea' : '#f5f5f5',
          }}
        >
          {tally.quorum_met === false && proposal.quorum_type !== 'hard' ? (
            <>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#b45309' }}>Not quorate</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: '#666' }}>
                Only {tally.eligible_count && tally.eligible_count > 0 ? Math.round((tally.total / tally.eligible_count) * 100) : 0}% of members participated
                {' '}({proposal.quorum}% required) — result is non-binding
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: result === 'passed' ? '#2d9a4e' : result === 'failed' ? '#d94040' : '#888' }}>
                {result === 'passed' ? 'Proposal passed' : result === 'failed' ? (tally.quorum_met === false ? 'Failed — quorum not met' : 'Proposal failed') : 'No decisive votes cast'}
              </p>
              {result !== 'no-votes' && (
                <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: '#666' }}>
                  {tally.quorum_met === false
                    ? `${tally.eligible_count && tally.eligible_count > 0 ? Math.round((tally.total / tally.eligible_count) * 100) : 0}% of members participated (${proposal.quorum}% required)`
                    : `${Math.round((tally.yes / (tally.yes + tally.no)) * 100)}% yes (${threshold}% required to pass)`}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Outcome tracking (closed proposals, moderators only) */}
      {proposal.status === 'closed' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {proposal.outcome && (
            <span
              data-testid="outcome-badge"
              style={{
                fontSize: 12, fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: 12,
                border: '1px solid',
                color: proposal.outcome === 'implemented' ? '#1a7f37' : proposal.outcome === 'in_progress' ? '#b45309' : '#888',
                borderColor: proposal.outcome === 'implemented' ? '#1a7f37' : proposal.outcome === 'in_progress' ? '#b45309' : '#ccc',
              }}
            >
              {proposal.outcome === 'implemented' ? 'Implemented' : proposal.outcome === 'in_progress' ? 'In progress' : 'Not implemented'}
            </span>
          )}
          {isModerator && (
            <select
              value={proposal.outcome ?? ''}
              onChange={(e) => saveOutcome((e.target.value || null) as Proposal['outcome'])}
              disabled={savingOutcome}
              data-testid="outcome-select"
              style={{ fontSize: 12, padding: '0.2rem 0.5rem', border: '1px solid #ddd', borderRadius: 4, color: '#555', cursor: 'pointer' }}
            >
              <option value="">Set outcome…</option>
              <option value="implemented">Implemented</option>
              <option value="in_progress">In progress</option>
              <option value="not_implemented">Not implemented</option>
            </select>
          )}
        </div>
      )}

      {/* Vetoes */}
      {!isDiscussion && (vetoes.length > 0 || (canVeto && isOpen)) && (
        <div style={{ marginBottom: '1.5rem' }}>
          {vetoes.length > 0 && (
            <div style={{ border: '1px solid #f5c0c0', borderRadius: 6, padding: '0.75rem 1.25rem', background: '#fdecea', marginBottom: '0.75rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: 14, color: '#d94040' }}>
                {vetoes.length === 1 ? '1 veto in effect' : `${vetoes.length} vetoes in effect`} — this proposal cannot pass while vetoed
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {vetoes.map((v) => {
                  const vetoAuthor = userMap[v.author_id];
                  const isMyVeto = v.id === myVeto?.id;
                  const canRetract = isMyVeto || isModerator;
                  return (
                    <div key={v.id} data-testid="veto-item" style={{ fontSize: 13, color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span>
                        <strong>{vetoAuthor?.name ?? 'Unknown'}</strong>: {v.reason}
                      </span>
                      {canRetract && (
                        <ConfirmButton
                          label="Retract"
                          confirmLabel="Yes"
                          onConfirm={() => retractVeto(v.id)}
                          style={{ fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer', flexShrink: 0 }}
                          confirmStyle={{ background: 'none', border: '1px solid #ddd', borderRadius: 3, color: '#d94040' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {canVeto && isOpen && !myVeto && (
            showVetoForm ? (
              <form onSubmit={castVeto} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  placeholder="Reason for veto (required)"
                  value={vetoReason}
                  onChange={(e) => setVetoReason(e.target.value)}
                  autoFocus
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                />
                <button type="submit" disabled={castingVeto || !vetoReason.trim()} style={{ fontSize: 12, padding: '0.35rem 0.75rem', color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  {castingVeto ? 'Casting…' : 'Cast veto'}
                </button>
                <button type="button" onClick={() => setShowVetoForm(false)} style={{ fontSize: 12, padding: '0.35rem 0.75rem', background: 'none', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowVetoForm(true)}
                data-testid="cast-veto-btn"
                style={{ fontSize: 12, padding: '0.35rem 0.75rem', color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Cast veto
              </button>
            )
          )}
        </div>
      )}

      {/* Tally */}
      {!isDiscussion && <div
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
        {org.voting_visibility === 'hidden' && isOpen && !isDeliberating ? (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Vote counts are hidden until this proposal closes.</p>
        ) : tallyLoading ? (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Loading tally…</p>
        ) : tally ? (
          <>
            {isMultipleChoice ? (
              <div>
                {tally.options.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>No options defined.</p>
                ) : (
                  tally.options.map((opt) => {
                    const pct = tally.total > 0 ? Math.round((opt.count / tally.total) * 100) : 0;
                    return (
                      <div key={opt.id} style={{ marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                          <span>{opt.text}</span>
                          <span style={{ color: '#888' }}>{opt.count} vote{opt.count !== 1 ? 's' : ''} ({pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#3358c4', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    );
                  })
                )}
                <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: '#aaa' }}>{tally.total} vote{tally.total !== 1 ? 's' : ''} total</p>
              </div>
            ) : (
              <VoteTally tally={tally} />
            )}
            {tally.quorum_met !== null && tally.eligible_count != null && (
              <p style={{ margin: '0.75rem 0 0', fontSize: 12, color: tally.quorum_met ? '#2d9a4e' : '#b45309' }}>
                {tally.total} of {tally.eligible_count} member{tally.eligible_count !== 1 ? 's' : ''} participated
                {' '}({tally.eligible_count > 0 ? Math.round((tally.total / tally.eligible_count) * 100) : 0}% — {proposal.quorum}% quorum required)
                {tally.quorum_met ? ' — quorate' : ' — not quorate'}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Could not load tally.</p>
        )}
      </div>}

      {/* Vote action */}
      {!isDiscussion && isDeliberating && (
        <div style={{ border: '1px solid #ddd6fe', borderRadius: 6, padding: '0.75rem 1.25rem', background: '#faf5ff', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#6d28d9', fontWeight: 500 }}>Deliberation phase — voting is not yet open.</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: '#888' }}>
            Use this time to read the arguments and discussion below. Voting opens {new Date(proposal.deliberation_ends_at as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>
      )}
      {!isDiscussion && isOpen && !isDeliberating && (
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
          {currentUser && !myVote && delegationChain && (
            <div style={{
              background: '#f0f7ff',
              border: '1px solid #c3d6fb',
              borderRadius: 4,
              padding: '0.6rem 0.75rem',
              marginBottom: '0.75rem',
              fontSize: 13,
              color: '#444',
            }}>
              <div style={{ marginBottom: delegationChain.voter ? '0.3rem' : 0 }}>
                <span style={{ color: '#888', fontSize: 12 }}>Your vote flows: </span>
                {delegationChain.chain.map((link, i) => (
                  <span key={link.user_id}>
                    {i > 0 && <span style={{ color: '#aaa', margin: '0 0.2rem' }}>→</span>}
                    <strong>{i === 0 ? 'You' : link.name}</strong>
                  </span>
                ))}
                {delegationChain.voter && (
                  <>
                    <span style={{ color: '#aaa', margin: '0 0.2rem' }}>→</span>
                    <strong>{delegationChain.voter.name}</strong>
                    {' '}voted{' '}
                    <strong style={{ color: choiceColors[delegationChain.voter.choice as VoteChoice] }}>
                      {delegationChain.voter.choice}
                    </strong>
                  </>
                )}
                {!delegationChain.voter && (
                  <span style={{ color: '#888' }}> — delegate hasn't voted yet</span>
                )}
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>Cast your own vote below to override.</span>
            </div>
          )}

          {!currentUser ? (
            <p style={{ fontSize: 14, color: '#666' }}>
              Please sign in to vote on this proposal.
            </p>
          ) : myVote && !changingVote ? (
            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: 14 }}>
                {isMultipleChoice ? (
                  <>You voted for <strong>{proposalOptions.find((o) => o.id === myVote.option_id)?.text ?? 'unknown option'}</strong>.</>
                ) : (
                  <>You voted <strong style={{ color: choiceColors[myVote.choice as VoteChoice] }}>{myVote.choice}</strong>.</>
                )}
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
              {isMultipleChoice ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {proposalOptions.map((opt) => (
                    <button
                      key={opt.id}
                      data-testid={`vote-option-${opt.id}`}
                      onClick={() => myVote ? changeVote(null, opt.id) : castVote(null, opt.id)}
                      disabled={voting}
                      style={{
                        fontSize: 13,
                        padding: '0.4rem 1rem',
                        cursor: 'pointer',
                        background: myVote?.option_id === opt.id ? '#3358c4' : '#f5f5f5',
                        color: myVote?.option_id === opt.id ? '#fff' : '#333',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        textAlign: 'left',
                      }}
                    >
                      {opt.text}
                    </button>
                  ))}
                  {changingVote && (
                    <button
                      onClick={() => setChangingVote(false)}
                      style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd', alignSelf: 'flex-start' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
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
              )}
            </div>
          )}

          {voteError && (
            <p style={{ color: '#d94040', fontSize: 13, margin: '0.75rem 0 0' }}>{voteError}</p>
          )}
        </div>
      )}

      {!isDiscussion && isWithdrawn && (
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: '0.75rem 1.25rem', background: '#f9f9f9', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#888' }}>This proposal was withdrawn — voting is no longer available.</p>
        </div>
      )}

      {!isDiscussion && !isOpen && !isWithdrawn && (
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
            {isModerator && !isDiscussion && (
              <a
                href={`/api/proposals/${id}/tally/csv`}
                download={`votes-${id}.csv`}
                data-testid="export-csv"
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', border: '1px solid #ddd', borderRadius: 4, color: '#555', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                Export CSV
              </a>
            )}
            {isModerator && (
              <button
                data-testid={proposal.pinned ? 'unpin-proposal' : 'pin-proposal'}
                onClick={() => handleAction(
                  proposal.pinned ? 'Proposal unpinned' : 'Proposal pinned',
                  () => proposal.pinned ? proposalsApi.unpin(id) : proposalsApi.pin(id),
                )}
                disabled={actioning}
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid #ddd', background: 'none' }}
              >
                {proposal.pinned ? 'Unpin' : 'Pin to top'}
              </button>
            )}
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

      {/* Arguments */}
      <div style={{ marginTop: '2.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Arguments ({proposalArguments.length})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          {(['for', 'against'] as const).map((side) => {
            const items = side === 'for' ? forArguments : againstArguments;
            const color = side === 'for' ? '#1a7f37' : '#d94040';
            const label = side === 'for' ? 'For' : 'Against';
            return (
              <div key={side}>
                <p style={{ margin: '0 0 0.6rem', fontSize: 13, fontWeight: 600, color }}>{label}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {items.map((a: Argument) => {
                    const argAuthor = a.author_id ? userMap[a.author_id] : undefined;
                    const isOwn = currentUser?.id === a.author_id;
                    return (
                      <div
                        key={a.id}
                        data-testid={`argument-${side}`}
                        style={{ border: `1px solid ${side === 'for' ? '#d3f0da' : '#f5c0c0'}`, borderRadius: 6, padding: '0.6rem 0.75rem', fontSize: 13, color: '#333', lineHeight: 1.5 }}
                      >
                        <p style={{ margin: '0 0 0.3rem' }}>{a.body}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#aaa' }}>{argAuthor?.name ?? 'Unknown'}</span>
                          {(isOwn || isModerator) && (
                            <ConfirmButton
                              label="Remove"
                              confirmLabel="Yes"
                              onConfirm={() => deleteArgument(a.id)}
                              style={{ fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer' }}
                              confirmStyle={{ background: 'none', border: '1px solid #ddd', borderRadius: 3, color: '#d94040' }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>No {label.toLowerCase()} arguments yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {currentUser && isOpen && (
          <form onSubmit={postArgument} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['for', 'against'] as const).map((s) => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="arg-side" value={s} checked={argSide === s} onChange={() => setArgSide(s)} />
                  <span style={{ color: s === 'for' ? '#1a7f37' : '#d94040', fontWeight: 600 }}>{s === 'for' ? 'For' : 'Against'}</span>
                </label>
              ))}
            </div>
            <textarea
              value={argBody}
              onChange={(e) => setArgBody(e.target.value.slice(0, 2000))}
              rows={2}
              placeholder={argSide === 'against' ? 'Add an against argument…' : 'Add a for argument…'}
              style={{ width: '100%', padding: '0.4rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div>
              <button
                type="submit"
                disabled={postingArg || !argBody.trim()}
                style={{ fontSize: 12, padding: '0.25rem 0.9rem', cursor: 'pointer' }}
              >
                {postingArg ? 'Adding…' : 'Add argument'}
              </button>
            </div>
          </form>
        )}
      </div>

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
              const isHidden = !!c.hidden_by;
              return (
                <div key={c.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: isHidden ? '#f0f0f0' : '#e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: '#999', flexShrink: 0,
                  }}>
                    {isHidden ? '–' : (commentAuthor ? commentAuthor.name.charAt(0).toUpperCase() : '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isHidden ? (
                      <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic', padding: '0.4rem 0' }}>
                        Comment removed by moderator
                        {c.hidden_reason && <span> — {c.hidden_reason}</span>}
                        {isModerator && (
                          <button
                            type="button"
                            onClick={() => unhideComment(c.id)}
                            style={{ marginLeft: '0.75rem', fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer' }}
                          >
                            Unhide
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {commentAuthor?.name ?? 'Unknown'}
                          </span>
                          <span style={{ fontSize: 12, color: '#aaa' }}>
                            {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {c.pinned_at && (
                            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>📌 Pinned</span>
                          )}
                          {c.edited_at && (
                            <span style={{ fontSize: 11, color: '#bbb' }}>(edited)</span>
                          )}
                          {(isOwn || isModerator || isAuthor) && editingCommentId !== c.id && hidingCommentId !== c.id && (
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
                              {(isModerator || isAuthor) && (
                                <button
                                  type="button"
                                  onClick={() => c.pinned_at ? unpinComment(c.id) : pinComment(c.id)}
                                  style={{ fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer' }}
                                >
                                  {c.pinned_at ? 'Unpin' : 'Pin'}
                                </button>
                              )}
                              {isModerator && (
                                <button
                                  type="button"
                                  onClick={() => { setHidingCommentId(c.id); setHideReason(''); }}
                                  style={{ fontSize: 11, padding: '0.1rem 0.4rem', color: '#aaa', border: '1px solid #e0e0e0', background: 'none', borderRadius: 3, cursor: 'pointer' }}
                                >
                                  Hide
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
                              data-testid="comment-edit-textarea"
                              value={editCommentBody}
                              onChange={(e) => setEditCommentBody(e.target.value.slice(0, COMMENT_MAX))}
                              rows={3}
                              maxLength={COMMENT_MAX}
                              style={{ width: '100%', padding: '0.4rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical', marginBottom: '0.4rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button type="submit" disabled={!editCommentBody.trim()} style={{ fontSize: 12, padding: '0.2rem 0.7rem', cursor: 'pointer' }}>Save</button>
                              <button type="button" onClick={() => setEditingCommentId(null)} style={{ fontSize: 12, padding: '0.2rem 0.7rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd' }}>Cancel</button>
                            </div>
                          </form>
                        ) : hidingCommentId === c.id ? (
                          <form onSubmit={(e) => hideComment(c.id, e)} style={{ marginTop: '0.25rem' }}>
                            <input
                              type="text"
                              placeholder="Reason for hiding (required)"
                              value={hideReason}
                              onChange={(e) => setHideReason(e.target.value)}
                              autoFocus
                              style={{ width: '100%', padding: '0.35rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', marginBottom: '0.35rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button type="submit" disabled={!hideReason.trim()} style={{ fontSize: 12, padding: '0.2rem 0.7rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 3 }}>Hide</button>
                              <button type="button" onClick={() => setHidingCommentId(null)} style={{ fontSize: 12, padding: '0.2rem 0.7rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd' }}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                              <MarkdownContent content={c.body} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {currentUser && (
                                <button
                                  type="button"
                                  data-testid="quote-reply-btn"
                                  onClick={() => quoteReply(c.body)}
                                  style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #e0e0e0', borderRadius: 10, background: 'transparent', cursor: 'pointer', color: '#555' }}
                                >
                                  Reply
                                </button>
                              )}
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
                                      fontSize: 13, padding: '1px 6px',
                                      border: `1px solid ${hasReacted ? '#c3d6fb' : '#e0e0e0'}`,
                                      borderRadius: 10,
                                      background: hasReacted ? '#e8f0fe' : 'transparent',
                                      cursor: currentUser ? 'pointer' : 'default',
                                      opacity: count === 0 ? 0.35 : 1,
                                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#555',
                                    }}
                                  >
                                    {emoji}{count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
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
              <MentionTextarea
                ref={commentTextareaRef}
                id="comment-body"
                data-testid="comment-body"
                value={commentBody}
                onChange={setCommentBody}
                orgSlug={org.slug}
                maxLength={COMMENT_MAX}
                rows={3}
                placeholder="Share your thoughts… Use @Name to mention members"
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
