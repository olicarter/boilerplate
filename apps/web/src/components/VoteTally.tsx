import type { TallyResult } from '../api';

export function VoteTally({ tally }: { tally: TallyResult }) {
  const decisive = tally.yes + tally.no;

  // Yes/No percentages are relative to decisive votes only (abstentions are neutral).
  const yesWidth  = decisive > 0 ? Math.round((tally.yes / decisive) * 100) : 0;
  const noWidth   = decisive > 0 ? Math.round((tally.no  / decisive) * 100) : 0;

  return (
    <div>
      {/* Yes / No bar */}
      {decisive > 0 ? (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 4 }}>
            <span style={{ color: '#2d9a4e' }}>Yes — {tally.yes} ({yesWidth}%)</span>
            <span style={{ color: '#d94040' }}>No — {tally.no} ({noWidth}%)</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#eee' }}>
            <div style={{ width: `${yesWidth}%`, background: '#2d9a4e', transition: 'width 0.3s ease' }} />
            <div style={{ width: `${noWidth}%`, background: '#d94040', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 0.75rem' }}>No yes/no votes yet.</p>
      )}

      {/* Abstain count (shown separately) */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: 12, color: '#888' }}>
        <span>{tally.total} {tally.total === 1 ? 'vote' : 'votes'} total (delegation-resolved)</span>
        {tally.abstain > 0 && <span>· {tally.abstain} abstain</span>}
      </div>
    </div>
  );
}
