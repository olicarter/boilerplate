import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { proposalsApi, type Proposal, type TallyResult } from '../api';
import { formatDate } from '../utils/format';

export function EmbedProposalPage() {
  const { id } = useParams({ from: '/embed/proposals/$id' });
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [tally, setTally] = useState<TallyResult | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/proposals/${id}`).then((r) => r.json()),
      proposalsApi.tally(id),
    ])
      .then(([p, t]) => {
        setProposal(p);
        setTally(t);
        return fetch(`/api/orgs`).then((r) => r.json()).then((orgs: Array<{ id: string; slug: string }>) => {
          const org = orgs.find((o) => o.id === p.organisation_id);
          if (org) setOrgSlug(org.slug);
        }).catch(() => {});
      })
      .catch(() => setError('Failed to load proposal'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={containerStyle}><p style={mutedStyle}>Loading…</p></div>;
  if (error || !proposal) return <div style={containerStyle}><p style={{ color: '#c00', fontSize: 13 }}>Proposal not found</p></div>;

  const isOpen = proposal.status === 'open';
  const totalVotes = tally ? tally.yes + tally.no + tally.abstain : 0;
  const yesP = totalVotes > 0 ? Math.round((tally!.yes / totalVotes) * 100) : 0;
  const noP = totalVotes > 0 ? Math.round((tally!.no / totalVotes) * 100) : 0;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3 }}>{proposal.title}</p>
        <span style={{ ...badgeStyle, background: isOpen ? '#e6f7e6' : '#f0f0f0', color: isOpen ? '#1a7a1a' : '#666' }}>
          {isOpen ? 'Open' : proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
        </span>
      </div>
      {proposal.closes_at && (
        <p style={{ ...mutedStyle, marginBottom: 8 }}>
          {isOpen ? `Closes ${formatDate(proposal.closes_at)}` : `Closed ${formatDate(proposal.closed_at ?? proposal.closes_at)}`}
        </p>
      )}
      {tally && totalVotes > 0 && (
        <div style={{ marginBottom: 8 }}>
          {[
            { label: 'For', count: tally.yes, pct: yesP, color: '#1a7a1a' },
            { label: 'Against', count: tally.no, pct: noP, color: '#c00' },
            { label: 'Abstain', count: tally.abstain, pct: 100 - yesP - noP, color: '#888' },
          ].map(({ label, count, pct, color }) => (
            <div key={label} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: '#444' }}>{label}</span>
                <span style={{ color }}>{count} ({pct}%)</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: '#eee', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
          <p style={{ ...mutedStyle, marginTop: 4 }}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</p>
        </div>
      )}
      {tally && totalVotes === 0 && <p style={mutedStyle}>No votes yet</p>}
      <a
        href={orgSlug ? `${window.location.origin}/orgs/${orgSlug}/proposals/${id}` : '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 11, color: '#555', textDecoration: 'none', borderTop: '1px solid #eee', paddingTop: 6, display: 'block' }}
      >
        View on Ripple →
      </a>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  padding: '12px 14px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  background: '#fff',
  maxWidth: 360,
  boxSizing: 'border-box',
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: '#888',
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 7px',
  borderRadius: 10,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  marginLeft: 8,
};
