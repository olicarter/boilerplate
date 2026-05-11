import { useState, useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { orgsApi, type Organisation, type Proposal } from '../api';
import styles from './PublicResultsPage.module.css';

function computeResult(yes: number, no: number, threshold: number): 'passed' | 'failed' | 'no-votes' {
  if (yes + no === 0) return 'no-votes';
  return (yes / (yes + no)) * 100 >= threshold ? 'passed' : 'failed';
}

const RESULT_LABELS: Record<string, string> = {
  passed: 'Passed',
  failed: 'Failed',
  withdrawn: 'Withdrawn',
  'no-votes': 'No votes',
};

function resultBadgeClass(key: string) {
  if (key === 'passed') return styles.badgePassed;
  if (key === 'failed') return styles.badgeFailed;
  if (key === 'withdrawn') return styles.badgeWithdrawn;
  return styles.badgeNoVotes;
}

export function PublicResultsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [org, setOrg] = useState<Organisation | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tallies, setTallies] = useState<Record<string, { yes: number; no: number; abstain: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    orgsApi.getPublicResults(slug)
      .then(async ({ org, proposals }) => {
        setOrg(org);
        setProposals(proposals);

        const closed = proposals.filter((p) => p.status === 'closed');
        const tallyResults = await Promise.allSettled(
          closed.map((p) =>
            fetch(`/api/proposals/${p.id}/tally`).then((r) => r.json()).then((t) => ({ id: p.id, ...t })),
          ),
        );
        const tallyMap: Record<string, { yes: number; no: number; abstain: number }> = {};
        for (const r of tallyResults) {
          if (r.status === 'fulfilled') tallyMap[r.value.id] = r.value;
        }
        setTallies(tallyMap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!org) return null;

  return (
    <div className={styles.page}>
      <div className={styles.orgHeader}>
        <h1 className={styles.orgName}>{org.name}</h1>
        {org.description && <p className={styles.orgDescription}>{org.description}</p>}
        <p className={styles.subtitle}>Public governance decisions</p>
      </div>

      {proposals.length === 0 ? (
        <p className={styles.empty}>No decisions have been published yet.</p>
      ) : (
        <div className={styles.list}>
          {proposals.map((p) => {
            const tally = tallies[p.id];
            const resultKey = p.status === 'withdrawn'
              ? 'withdrawn'
              : tally
                ? computeResult(tally.yes, tally.no, p.threshold ?? 50)
                : 'no-votes';
            const label = RESULT_LABELS[resultKey];
            const closedDate = p.closed_at
              ? new Date(p.closed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : null;

            return (
              <div key={p.id} data-testid="result-row" className={styles.row}>
                <div className={styles.rowBody}>
                  <p className={styles.rowTitle}>{p.title}</p>
                  {closedDate && <p className={styles.rowDate}>Closed {closedDate}</p>}
                  {tally && p.status === 'closed' && (
                    <p className={styles.rowTally}>
                      {tally.yes} yes · {tally.no} no · {tally.abstain} abstain
                      {' · '}
                      {tally.yes + tally.no > 0
                        ? `${Math.round((tally.yes / (tally.yes + tally.no)) * 100)}% yes (${p.threshold ?? 50}% required)`
                        : 'no decisive votes'}
                    </p>
                  )}
                </div>
                <span data-testid="result-badge" className={`${styles.badge} ${resultBadgeClass(resultKey)}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className={styles.footer}>
        Powered by{' '}
        <Link to="/" className={styles.footerLink}>Ripple</Link>
      </p>
    </div>
  );
}
