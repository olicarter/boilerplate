import { useSearch, Link } from '@tanstack/react-router';

export function VoteConfirmedPage() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const status = search.status ?? 'invalid';
  const proposalId = search.proposal_id;

  const messages: Record<string, { title: string; body: string; icon: string }> = {
    success:       { icon: '✓', title: 'Vote cast',       body: 'Your vote has been recorded. Thank you for participating.' },
    already_voted: { icon: '·', title: 'Already voted',   body: 'Your vote has already been recorded for this proposal.' },
    closed:        { icon: '·', title: 'Voting closed',   body: 'This proposal is no longer open for voting.' },
    invalid:       { icon: '✕', title: 'Invalid link',    body: 'This vote link is invalid or has expired.' },
  };
  const msg = messages[status] ?? messages.invalid;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 6, padding: '2.5rem 2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Ripple</div>
        <div style={{ fontSize: 32, marginBottom: '1rem' }}>{msg.icon}</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 0.75rem' }}>{msg.title}</h1>
        <p style={{ fontSize: 14, color: '#555', margin: '0 0 1.5rem', lineHeight: 1.6 }}>{msg.body}</p>
        {status === 'success' && proposalId && (
          <p style={{ margin: '0 0 1rem' }}>
            <Link to="/" style={{ fontSize: 13, color: '#111', textDecoration: 'underline' }}>View proposal results</Link>
          </p>
        )}
        <Link to="/" style={{ fontSize: 13, color: '#111', textDecoration: 'underline' }}>Go to Ripple</Link>
      </div>
    </div>
  );
}
