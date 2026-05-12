import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { usersCollection, membershipsCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { useCurrentUser } from '../context';
import type { Proposal, Vote, Comment, User, Membership, Topic } from '../api';
import styles from './ActivityFeedPage.module.css';

type ActivityEvent =
  | { kind: 'proposal_opened'; ts: string; proposal: Proposal; topic?: Topic }
  | { kind: 'proposal_closed'; ts: string; proposal: Proposal; topic?: Topic }
  | { kind: 'vote_cast'; ts: string; vote: Vote; proposal?: Proposal; user?: User }
  | { kind: 'comment_posted'; ts: string; comment: Comment; proposal?: Proposal; user?: User }
  | { kind: 'member_joined'; ts: string; membership: Membership; user?: User };

export function ActivityFeedPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const currentUser = useCurrentUser();
  const { org, collections: { proposalsCollection, topicsCollection, votesCollection, commentsCollection } } = useOrg();
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allComments } = useLiveQuery(commentsCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);

  const isPublicVoting = org.voting_visibility !== 'hidden';

  const events = useMemo<ActivityEvent[]>(() => {
    const proposals = allProposals ?? [];
    const topics = allTopics ?? [];
    const votes = allVotes ?? [];
    const comments = allComments ?? [];
    const users = allUsers ?? [];
    const memberships = allMemberships ?? [];

    const topicMap = Object.fromEntries(topics.map((t: Topic) => [t.id, t]));
    const proposalMap = Object.fromEntries(proposals.map((p: Proposal) => [p.id, p]));
    const userMap = Object.fromEntries(users.map((u: User) => [u.id, u]));

    const result: ActivityEvent[] = [];

    for (const p of proposals) {
      if (p.status !== 'draft') {
        result.push({ kind: 'proposal_opened', ts: p.created_at, proposal: p, topic: topicMap[p.topic_id] as Topic | undefined });
      }
      if (p.status === 'closed' && p.closed_at) {
        result.push({ kind: 'proposal_closed', ts: p.closed_at as string, proposal: p, topic: topicMap[p.topic_id] as Topic | undefined });
      }
    }

    if (isPublicVoting) {
      for (const v of votes) {
        result.push({ kind: 'vote_cast', ts: v.created_at, vote: v, proposal: proposalMap[v.proposal_id] as Proposal | undefined, user: userMap[v.user_id] as User | undefined });
      }
    }

    for (const c of comments) {
      if (!c.hidden_by) {
        result.push({ kind: 'comment_posted', ts: c.created_at, comment: c, proposal: proposalMap[c.proposal_id] as Proposal | undefined, user: userMap[c.author_id] as User | undefined });
      }
    }

    const orgMemberships = memberships.filter((m: Membership) => m.organisation_id === org.id);
    for (const m of orgMemberships) {
      result.push({ kind: 'member_joined', ts: m.created_at ?? new Date(0).toISOString(), membership: m, user: userMap[m.user_id] as User | undefined });
    }

    result.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return result.slice(0, 100);
  }, [allProposals, allTopics, allVotes, allComments, allUsers, allMemberships, org.id, isPublicVoting]);

  function timeAgo(ts: string): string {
    const ms = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (minutes < 2) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function renderEvent(event: ActivityEvent, i: number) {
    let icon = '•';
    let content: React.ReactNode;

    if (event.kind === 'proposal_opened') {
      icon = '📋';
      content = (
        <>
          <Link to="/orgs/$slug/proposals/$id" params={{ slug, id: event.proposal.id }} className={styles.eventLink}>
            {event.proposal.title}
          </Link>
          {' '}
          <span className={`${styles.badge} ${styles.badgeOpened}`}>opened</span>
          {event.topic && <span className={`${styles.badge} ${styles.badgeTopic}`}>{event.topic.name}</span>}
        </>
      );
    } else if (event.kind === 'proposal_closed') {
      icon = '🔒';
      content = (
        <>
          <Link to="/orgs/$slug/proposals/$id" params={{ slug, id: event.proposal.id }} className={styles.eventLink}>
            {event.proposal.title}
          </Link>
          {' '}
          <span className={`${styles.badge} ${styles.badgeClosed}`}>closed</span>
        </>
      );
    } else if (event.kind === 'vote_cast') {
      const choiceClass = event.vote.choice === 'yes'
        ? styles.voteYes
        : event.vote.choice === 'no'
          ? styles.voteNo
          : styles.voteAbstain;
      icon = '🗳️';
      content = (
        <>
          {event.proposal?.anonymous_voting ? (
            <span className={styles.eventLink}>Anonymous member</span>
          ) : (
            <Link to="/orgs/$slug/users/$id" params={{ slug, id: event.vote.user_id }} className={styles.eventLink}>
              {event.user?.name ?? 'Someone'}
            </Link>
          )}
          {' voted '}
          {event.vote.choice ? (
            <span className={choiceClass}>{event.vote.choice}</span>
          ) : 'for an option'}
          {' on '}
          {event.proposal ? (
            <Link to="/orgs/$slug/proposals/$id" params={{ slug, id: event.proposal.id }} className={styles.eventLink}>
              {event.proposal.title}
            </Link>
          ) : 'a proposal'}
        </>
      );
    } else if (event.kind === 'comment_posted') {
      icon = '💬';
      content = (
        <>
          <Link to="/orgs/$slug/users/$id" params={{ slug, id: event.comment.author_id }} className={styles.eventLink}>
            {event.user?.name ?? 'Someone'}
          </Link>
          {' commented on '}
          {event.proposal ? (
            <Link to="/orgs/$slug/proposals/$id" params={{ slug, id: event.proposal.id }} className={styles.eventLink}>
              {event.proposal.title}
            </Link>
          ) : 'a proposal'}
          {event.comment.body && (
            <span className={styles.eventComment}>
              "{event.comment.body.slice(0, 120)}{event.comment.body.length > 120 ? '…' : ''}"
            </span>
          )}
        </>
      );
    } else if (event.kind === 'member_joined') {
      icon = '👤';
      content = (
        <>
          <Link to="/orgs/$slug/users/$id" params={{ slug, id: event.membership.user_id }} className={styles.eventLink}>
            {event.user?.name ?? 'Someone'}
          </Link>
          {' joined the organisation'}
        </>
      );
    }

    return (
      <div
        key={i}
        data-testid={`activity-event-${event.kind}`}
        className={styles.event}
      >
        <span className={styles.eventIcon}>{icon}</span>
        <div className={styles.eventBody}>{content}</div>
        <span className={styles.eventTime}>{timeAgo(event.ts)}</span>
      </div>
    );
  }

  if (!currentUser) {
    return <p className={styles.signIn}>Sign in to view activity.</p>;
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Activity feed</h2>
      {events.length === 0 ? (
        <p className={styles.empty}>No activity yet. Create a proposal to get started.</p>
      ) : (
        <div>
          {events.map((event, i) => renderEvent(event, i))}
        </div>
      )}
    </div>
  );
}
