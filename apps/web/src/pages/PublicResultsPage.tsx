import { useState, useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { orgsApi, type Organisation, type Proposal } from '../api';

function computeResult(yes: number, no: number, threshold: number): 'passed' | 'failed' | 'no-votes' {
  if (yes + no === 0) return 'no-votes';
  return (yes / (yes + no)) * 100 >= threshold ? 'passed' : 'failed';
}

const RESULT_COLORS: Record<string, string> = {
  passed: '#1a7f37',
  failed: '#d94040',
  withdrawn: '#888',
  'no-votes': '#888',
};

const RESULT_LABELS: Record<string, string> = {
  passed: 'Passed',
  failed: 'Failed',
  withdrawn: 'Withdrawn',
  'no-votes': 'No votes',
};

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

        // Fetch tallies for closed proposals in parallel
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

  if (loading) return <p style={{ fontSize: 14, color: '#aaa', padding: '2rem' }}>Loading…</p>;
  if (error) return <p style={{ fontSize: 14, color: '#d94040', padding: '2rem' }}>{error}</p>;
  if (!org) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>{org.name}</h1>
        {org.description && <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{org.description}</p>}
        <p style={{ margin: '0.5rem 0 0', fontSize: 13, color: '#aaa' }}>Public governance decisions</p>
      </div>

      {proposals.length === 0 ? (
        <p style={{ fontSize: 14, color: '#aaa' }}>No decisions have been published yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {proposals.map((p) => {
            const tally = tallies[p.id];
            const resultKey = p.status === 'withdrawn'
              ? 'withdrawn'
              : tally
                ? computeResult(tally.yes, tally.no, p.threshold ?? 50)
                : 'no-votes';
            const color = RESULT_COLORS[resultKey];
            const label = RESULT_LABELS[resultKey];
            const closedDate = p.closed_at
              ? new Date(p.closed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : null;

            return (
              <div
                key={p.id}
                data-testid="result-row"
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 0.25rem', fontSize: 15, fontWeight: 600, color: '#222' }}>{p.title}</p>
                  {closedDate && (
                    <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>Closed {closedDate}</p>
                  )}
                  {tally && p.status === 'closed' && (
                    <p style={{ margin: '0.3rem 0 0', fontSize: 12, color: '#888' }}>
                      {tally.yes} yes · {tally.no} no · {tally.abstain} abstain
                      {' · '}
                      {tally.yes + tally.no > 0
                        ? `${Math.round((tally.yes / (tally.yes + tally.no)) * 100)}% yes (${p.threshold ?? 50}% required)`
                        : 'no decisive votes'}
                    </p>
                  )}
                </div>
                <span
                  data-testid="result-badge"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color,
                    border: `1px solid ${color}`,
                    borderRadius: 12,
                    padding: '0.2rem 0.65rem',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: '2rem', fontSize: 12, color: '#ccc', textAlign: 'center' }}>
        Powered by{' '}
        <Link to="/" style={{ color: '#ccc' }}>Ripple</Link>
      </p>
    </div>
  );
}
