import { useEffect, useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { proposalsCollection, topicsCollection, votesCollection, usersCollection } from '../collections';
import { proposalsApi, type TallyResult, type DelegationVote, type Proposal, type Topic, type Vote, type User } from '../api';
import { VoteTally } from '../components/VoteTally';
import { MarkdownContent } from '../components/MarkdownContent';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';

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

  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);

  const addToast = useToast();

  const [tally, setTally] = useState<TallyResult | null>(null);
  const [tallyLoading, setTallyLoading] = useState(true);
  const [delegationVote, setDelegationVote] = useState<DelegationVote | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [changingVote, setChangingVote] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actioning, setActioning] = useState(false);

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

  async function handleAction(label: string, successMsg: string, action: () => Promise<unknown>) {
    if (!window.confirm(`${label}?`)) return;
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

  return (
    <div style={{ maxWidth: 680 }}>
      <Link
        to="/proposals"
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

      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem' }}>{proposal.title}</h2>

      {proposal.description && (
        <div style={{ margin: '0 0 1rem' }}>
          <MarkdownContent content={proposal.description} />
        </div>
      )}

      <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 1.5rem' }}>
        {author ? (
          <>
            by{' '}
            <Link to="/users/$id" params={{ id: author.id }} style={{ color: '#888', textDecoration: 'none' }}>
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
            onClick={() => handleAction('Publish this proposal', 'Proposal published', () => proposalsApi.publish(id))}
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
        {tallyLoading ? (
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
                <button
                  onClick={removeVote}
                  disabled={voting}
                  style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none' }}
                >
                  Remove vote
                </button>
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

      {/* Author management actions */}
      {isAuthor && !isWithdrawn && (
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
              <button
                onClick={() => handleAction('Close voting on this proposal', 'Voting closed', () => proposalsApi.close(id))}
                disabled={actioning}
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid #ddd', background: 'none' }}
              >
                Close voting
              </button>
            )}
            {proposal.status === 'closed' && (
              <button
                onClick={() => handleAction('Reopen this proposal for voting', 'Proposal reopened', () => proposalsApi.reopen(id))}
                disabled={actioning}
                style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid #ddd', background: 'none' }}
              >
                Reopen
              </button>
            )}
            <button
              onClick={() => handleAction('Withdraw this proposal permanently', 'Proposal withdrawn', () => proposalsApi.withdraw(id))}
              disabled={actioning}
              style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none' }}
            >
              Withdraw
            </button>
          </div>
          {actionError && (
            <p style={{ color: '#d94040', fontSize: 13, margin: '0.75rem 0 0' }}>{actionError}</p>
          )}
        </div>
      )}
    </div>
  );
}
