import { useState, useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { orgsApi, type DecisionEntry } from '../api';
import styles from './DecisionRecordPage.module.css';

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  standard: 'Vote',
  discussion: 'Discussion',
  multiple_choice: 'Multiple choice',
  temperature_check: 'Temp check',
  consent: 'Consent',
  approval: 'Approval',
  score_voting: 'Score',
  ranked_choice: 'Ranked choice',
  petition: 'Petition',
  amendment: 'Amendment',
};

const OUTCOME_LABELS: Record<string, string> = {
  implemented: 'Implemented',
  in_progress: 'In progress',
  not_implemented: 'Not implemented',
};

type ResultFilter = 'all' | 'passed' | 'failed' | 'withdrawn' | 'no-votes';

const PAGE_SIZE = 25;

export function DecisionRecordPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [entries, setEntries] = useState<DecisionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    orgsApi.getDecisionRecord(slug, page, PAGE_SIZE)
      .then(({ items, total, totalPages }) => {
        setEntries(items);
        setTotal(total);
        setTotalPages(totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug, page]);

  async function handleExport() {
    setExporting(true);
    try {
      await orgsApi.exportDecisionRecord(slug);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  // Client-side filtering applies within the current page
  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.result !== filter) return false;
    if (search && !e.proposal.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Decision record</h1>
          <p className={styles.subheading}>All closed and withdrawn proposals with their outcomes</p>
        </div>
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={exporting || entries.length === 0}
          data-testid="export-csv-btn"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search decisions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          data-testid="decision-search"
        />
      </div>

      <div className={styles.filters}>
        {(['all', 'passed', 'failed', 'withdrawn', 'no-votes'] as const).map((f) => (
          <button
            key={f}
            data-testid={`filter-${f}`}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`${styles.filterPill} ${filter === f ? styles.filterPillActive : ''}`}
          >
            {f === 'all' ? `All (${total})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.list}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          {entries.length === 0
            ? 'No decisions yet. Closed proposals will appear here.'
            : 'No decisions match your filters.'}
        </p>
      ) : (
        <div className={styles.list}>
          {filtered.map(({ proposal, tally, result }) => {
            const closedDate = proposal.closed_at
              ? new Date(proposal.closed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            const yesPct = tally && (tally.yes + tally.no) > 0
              ? Math.round((tally.yes / (tally.yes + tally.no)) * 100)
              : null;

            return (
              <div key={proposal.id} className={styles.row} data-testid="decision-row">
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <Link
                      to="/orgs/$slug/proposals/$id"
                      params={{ slug, id: proposal.id }}
                      className={styles.rowTitle}
                    >
                      {proposal.title}
                    </Link>
                    <span className={`${styles.badge} ${styles[`badge_${result.replace('-', '_')}`]}`} data-testid="result-badge">
                      {result === 'no-votes' ? 'No votes' : result.charAt(0).toUpperCase() + result.slice(1)}
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.metaItem}>{proposal.topic_name}</span>
                    <span className={styles.metaDot}>·</span>
                    <span className={styles.metaItem}>{PROPOSAL_TYPE_LABELS[proposal.proposal_type] ?? proposal.proposal_type}</span>
                    {closedDate && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.metaItem}>Closed {closedDate}</span>
                      </>
                    )}
                    {proposal.author_name && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.metaItem}>by {proposal.author_name}</span>
                      </>
                    )}
                  </div>
                  {tally && proposal.status === 'closed' && (
                    <div className={styles.tally}>
                      <span className={styles.tallyYes}>{tally.yes} yes</span>
                      <span className={styles.tallyNo}>{tally.no} no</span>
                      {tally.abstain > 0 && <span className={styles.tallyAbstain}>{tally.abstain} abstain</span>}
                      {yesPct !== null && (
                        <span className={styles.tallyPct}>
                          {yesPct}% yes · {proposal.threshold}% required
                        </span>
                      )}
                    </div>
                  )}
                  {proposal.anonymous_voting && proposal.status === 'closed' && (
                    <p className={styles.anonNote}>Anonymous vote — tally not shown</p>
                  )}
                </div>
                {proposal.outcome && (
                  <span className={`${styles.outcomeBadge} ${styles[`outcome_${proposal.outcome}`]}`}>
                    {OUTCOME_LABELS[proposal.outcome]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
