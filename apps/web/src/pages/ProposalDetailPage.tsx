import { useEffect, useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuid } from 'uuid';
import { proposalsCollection, topicsCollection, votesCollection } from '../collections';
import { proposalsApi, type TallyResult, type Proposal, type Topic, type Vote } from '../api';
import { VoteTally } from '../components/VoteTally';
import { useCurrentUser } from '../context';

type VoteChoice = 'yes' | 'no' | 'abstain';

const choiceColors: Record<VoteChoice, string> = {
  yes: '#2d9a4e',
  no: '#d94040',
  abstain: '#888',
};

export function ProposalDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const currentUser = useCurrentUser();

  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);

  const [tally, setTally] = useState<TallyResult | null>(null);
  const [tallyLoading, setTallyLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [changingVote, setChangingVote] = useState(false);

  const proposal = (allProposals ?? []).find((p: Proposal) => p.id === id);
  const topic = proposal
    ? (allTopics ?? []).find((t: Topic) => t.id === proposal.topic_id)
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

  useEffect(() => {
    fetchTally();
  }, [id]);

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
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Failed to remove vote.');
    } finally {
      setVoting(false);
    }
  }

  if (!proposal) {
    return <p style={{ color: '#999', fontSize: 14 }}>Loading…</p>;
  }

  const isOpen = proposal.status === 'open';

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
            background: isOpen ? '#e6f9ed' : '#f5f5f5',
            color: isOpen ? '#2d9a4e' : '#888',
            border: `1px solid ${isOpen ? '#b3e5c2' : '#ddd'}`,
          }}
        >
          {proposal.status}
        </span>
      </div>

      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem' }}>{proposal.title}</h2>

      {proposal.description && (
        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
          {proposal.description}
        </p>
      )}

      <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 1.5rem' }}>
        Created {new Date(proposal.created_at).toLocaleDateString()}
        {proposal.closed_at && ` · Closed ${new Date(proposal.closed_at).toLocaleDateString()}`}
      </p>

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

      {!isOpen && (
        <p style={{ fontSize: 13, color: '#aaa' }}>This proposal is closed — voting is no longer available.</p>
      )}
    </div>
  );
}
