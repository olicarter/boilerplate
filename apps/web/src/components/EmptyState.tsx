type EmptyStateVariant = 'proposals' | 'delegations' | 'comments' | 'votes';

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  proposals: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="10" width="56" height="60" rx="6" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <rect x="20" y="22" width="32" height="3" rx="1.5" fill="var(--color-border-strong)"/>
      <rect x="20" y="30" width="40" height="2" rx="1" fill="var(--color-border)"/>
      <rect x="20" y="36" width="36" height="2" rx="1" fill="var(--color-border)"/>
      <rect x="20" y="42" width="28" height="2" rx="1" fill="var(--color-border)"/>
      <circle cx="56" cy="56" r="14" fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <line x1="56" y1="50" x2="56" y2="62" stroke="var(--color-border-strong)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="56" x2="62" y2="56" stroke="var(--color-border-strong)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  delegations: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="28" r="10" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <circle cx="56" cy="28" r="10" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <circle cx="40" cy="56" r="10" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <line x1="34" y1="28" x2="46" y2="28" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 2"/>
      <line x1="28" y1="36" x2="36" y2="48" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 2"/>
    </svg>
  ),
  comments: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="18" width="44" height="30" rx="6" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <polygon points="20,48 14,60 30,48" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="18" y="28" width="20" height="2" rx="1" fill="var(--color-border-strong)"/>
      <rect x="18" y="34" width="28" height="2" rx="1" fill="var(--color-border)"/>
      <rect x="26" y="38" width="44" height="26" rx="6" fill="var(--color-bg-subtle)" stroke="var(--color-border)" strokeWidth="1.5"/>
    </svg>
  ),
  votes: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="14" y="20" width="52" height="42" rx="6" fill="var(--color-bg-muted)" stroke="var(--color-border)" strokeWidth="1.5"/>
      <rect x="22" y="34" width="10" height="16" rx="2" fill="var(--color-border)"/>
      <rect x="35" y="28" width="10" height="22" rx="2" fill="var(--color-border-strong)"/>
      <rect x="48" y="38" width="10" height="12" rx="2" fill="var(--color-border)"/>
    </svg>
  ),
};

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ variant, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)', opacity: 0.7 }}>
        {illustrations[variant]}
      </div>
      <p style={{ margin: '0 0 var(--space-1)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)', color: 'var(--color-fg-muted)' }}>{title}</p>
      {description && (
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-base)', color: 'var(--color-fg-subtle)', maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
