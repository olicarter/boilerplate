import type { TallyResult } from '../api';

const rows = [
  { key: 'yes' as const, label: 'Yes', color: '#2d9a4e' },
  { key: 'no' as const, label: 'No', color: '#d94040' },
  { key: 'abstain' as const, label: 'Abstain', color: '#aaa' },
];

export function VoteTally({ tally }: { tally: TallyResult }) {
  const pct = (n: number) =>
    tally.total > 0 ? Math.round((n / tally.total) * 100) : 0;

  return (
    <div>
      {rows.map(({ key, label, color }) => (
        <div
          key={key}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}
        >
          <span style={{ width: 52, fontSize: 13, color: '#555' }}>{label}</span>
          <div
            style={{
              flex: 1,
              height: 12,
              background: '#eee',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct(tally[key])}%`,
                height: '100%',
                background: color,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ width: 72, fontSize: 13, textAlign: 'right', color: '#555' }}>
            {tally[key]} ({pct(tally[key])}%)
          </span>
        </div>
      ))}
      <p style={{ fontSize: 12, color: '#999', margin: '0.5rem 0 0' }}>
        {tally.total} vote{tally.total !== 1 ? 's' : ''} total (delegation-resolved)
      </p>
    </div>
  );
}
