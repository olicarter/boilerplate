import { Button } from '../components/ui';
import { useCurrentUser } from '../context';
import { useNavigate } from '@tanstack/react-router';

const features = {
  free: [
    '1 organisation',
    'Up to 15 members',
    'Unlimited proposals & votes',
    'All voting types (standard, ranked choice, approval…)',
    'Delegations & weighted voting',
    'Comments & deliberation',
    'Email notifications',
    'Audit log',
  ],
  pro: [
    'Unlimited organisations',
    'Unlimited members',
    'Everything in Free',
    'Participation analytics dashboard',
    'Email domain restriction',
    'Slack integration',
    'Priority support',
  ],
};

export function PricingPage() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  function handleGetStarted() {
    navigate({ to: '/' });
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 0.75rem' }}>Simple, transparent pricing</h1>
        <p style={{ fontSize: 16, color: 'var(--color-fg-muted)', margin: 0 }}>
          Start free. Upgrade when your organisation grows.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Free */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>$0</span>
              <span style={{ color: 'var(--color-fg-muted)', fontSize: 14 }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: '0.5rem 0 0' }}>For small teams and personal use</p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {features.free.map((f) => (
              <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: 14 }}>
                <span style={{ color: '#2d9a4e', flexShrink: 0, fontWeight: 700 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={handleGetStarted} style={{ width: '100%', justifyContent: 'center' }}>
            {currentUser ? 'Go to dashboard' : 'Get started free'}
          </Button>
        </div>

        {/* Pro */}
        <div style={{ border: '2px solid var(--color-fg)', borderRadius: 12, padding: '2rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, fontWeight: 700, background: 'var(--color-fg)', color: 'var(--color-bg)', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Popular
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>$29</span>
              <span style={{ color: 'var(--color-fg-muted)', fontSize: 14 }}>/month per organisation</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: '0.5rem 0 0' }}>For growing teams that need more</p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {features.pro.map((f) => (
              <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: 14 }}>
                <span style={{ color: '#2d9a4e', flexShrink: 0, fontWeight: 700 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button onClick={handleGetStarted} style={{ width: '100%', justifyContent: 'center' }}>
            {currentUser ? 'Upgrade your org' : 'Start free trial'}
          </Button>
        </div>
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--color-fg-muted)' }}>
          All plans include unlimited proposals, votes, and delegations. No credit card required to start.
        </p>
      </div>
    </div>
  );
}
